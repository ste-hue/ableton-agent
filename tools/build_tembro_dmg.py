#!/usr/bin/env python3
"""Build the single-file macOS beta installer disk image for Tembro."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import plistlib
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional, Union

from PIL import Image

from build_tembro_release import BRIDGE_DIR, REPO, build as build_release


VERSION = json.loads((REPO / "devices" / "Tembro" / "package.json").read_text())["version"]
DIST = REPO / "dist"
DEVICE_DIR = DIST / "Tembro"
ZIP_PATH = DIST / "Tembro-v0-mac.zip"
INSTALLER = REPO / "installer" / "Install Tembro.command"
INSTALLER_SOURCE = REPO / "installer" / "TembroInstaller.swift"
RUNTIME_VERIFIER = REPO / "installer" / "verify_tembro_runtime.py"
ICON_SOURCE = REPO / "assets" / "brand" / "tembro-icon.png"
REMOTE_SCRIPT = (
    REPO
    / ".venv"
    / "lib"
    / "python3.12"
    / "site-packages"
    / "Ableton_Live_MCP"
)
REMOTE_INIT_SHA256 = "a2a772621cd2f458a17391a17bab2bcf44dbc36e28494d0a4359c995403db757"
UPSTREAM_PIN = "70f7df9192b78d9bd9405f369c9e046c88f1610e"
M4L_SOURCE = REMOTE_SCRIPT.parent.parent / "m4l"
# Immutable upstream files, fetched via GitHub at UPSTREAM_PIN and verified
# against Git blob IDs. The wheel omits this directory although agent_m4l.py
# resolves HOST_JS relative to its parent (lib/python3.12/m4l).
M4L_ASSETS = {
    "agent_m4l_host.js": {
        "sha256": "6b6eec2e142bf091c055410bacebfb1c1b9d3d436027c668c67bf0eae4442e79",
        "git_blob_sha1": "09ee9caf4110a17567002c77524f629c9f666e3c",
    },
    "agent_audio_tap.js": {
        "sha256": "852775e2d90e174beb01bcf2526b6a300d3548b27d673543e0f6776eaa089745",
        "git_blob_sha1": "8bb77684ee7c538a272fe27961f74f9f008b52f0",
    },
    "AgentAudioTap.maxpat": {
        "sha256": "0bc1314ea50a2bdbc872e1992cafe0c5aab295c7200e3a16ed8eb9dc392ebd2a",
        "git_blob_sha1": "205f5bc8da57fb31e0567d54b1e05fca261ad821",
    },
    "AgentAudioTap.amxd": {
        "sha256": "af2eb81bf7584dec981db4c4ccf818536fe0577b8b362e831df414bc876ceb12",
        "git_blob_sha1": "028cbeadec2cfcafb0145782aa38e06b8d32b493",
    },
    "README.md": {
        "sha256": "212a3f89d0297a806613eebc9295fc38f3dfd1fab4858cf268fb13022f97c267",
        "git_blob_sha1": "f7be514c4a32c0cc68c81f894c147b2935f34824",
    },
}
UPSTREAM_LICENSE = (
    REPO
    / ".venv"
    / "lib"
    / "python3.12"
    / "site-packages"
    / "ableton_live_mcp-0.1.1.dist-info"
    / "licenses"
    / "LICENSE"
)


def run(*args: Union[str, Path]) -> None:
    subprocess.run([str(arg) for arg in args], check=True)


def build_icon(icon_path: Path) -> None:
    with Image.open(ICON_SOURCE) as source:
        source.convert("RGBA").save(icon_path, format="ICNS")


def validate_version(version: str) -> str:
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*)?", version):
        raise ValueError("version must have the form 0.1.7 or 0.1.7-beta.1")
    return version


def stamp_installer(destination: Path, api_url: str, version: str = VERSION) -> None:
    """Rewrite the installer script's version and official API URL so the
    banner and the stale-config guard always match the DMG being built."""
    text = INSTALLER.read_text()
    text, versions = re.subn(
        r'^TEMBRO_VERSION=".*"$', f'TEMBRO_VERSION="{validate_version(version)}"', text, count=1, flags=re.M
    )
    text, urls = re.subn(
        r'^OFFICIAL_API_URL=".*"$', f'OFFICIAL_API_URL="{api_url}"', text, count=1, flags=re.M
    )
    if versions != 1 or urls != 1:
        raise RuntimeError("installer script is missing TEMBRO_VERSION or OFFICIAL_API_URL")
    destination.write_text(text)
    destination.chmod(0o755)


def stage_variation_runtime(payload: Path, upstream_root: Path) -> None:
    """Export checked runtime files into the installer; never patch the source."""
    spec = importlib.util.spec_from_file_location("tembro_release_patch", BRIDGE_DIR / "patch_runtime.py")
    patcher = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(patcher)
    remote_init = upstream_root / "Ableton_Live_MCP" / "__init__.py"
    if remote_init.is_symlink() or hashlib.sha256(remote_init.read_bytes()).hexdigest() != REMOTE_INIT_SHA256:
        raise RuntimeError("exact pinned Remote Script __init__.py is required")
    patcher.export_overlay(upstream_root, payload / "variation-runtime")
    remote = payload / "Ableton_Live_MCP"
    remote.mkdir()
    shutil.copy2(remote_init, remote / "__init__.py")
    shutil.copy2(payload / "variation-runtime" / "Ableton_Live_MCP" / "bridge.py", remote / "bridge.py")
    shutil.copy2(RUNTIME_VERIFIER, payload / RUNTIME_VERIFIER.name)


def stage_m4l_assets(payload: Path, source: Path) -> None:
    """Copy only exact upstream resources; never ship local generated devices."""
    checked = {}
    manifest = {"pinned_commit": UPSTREAM_PIN, "files": {}}
    for name, expected in M4L_ASSETS.items():
        path = source / name
        if path.is_symlink() or not path.is_file():
            raise RuntimeError("exact pinned M4L asset is missing or linked: " + name)
        data = path.read_bytes()
        blob_id = hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()
        if hashlib.sha256(data).hexdigest() != expected["sha256"] or blob_id != expected["git_blob_sha1"]:
            raise RuntimeError("M4L asset differs from pinned upstream: " + name + "; supply --m4l-source from the exact upstream archive")
        checked[name] = data
        manifest["files"][name] = {**expected, "upstream_path": "m4l/" + name}
    destination = payload / "m4l"
    destination.mkdir()
    for name, data in checked.items():
        (destination / name).write_bytes(data)
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


def compile_installer(app_path: Path, temp: Path, api_url: str, upstream_root: Path | None = None, version: str = VERSION, m4l_source: Path | None = None) -> None:
    if not shutil.which("swiftc") or not shutil.which("lipo"):
        raise RuntimeError("swiftc and lipo are required to build the installer app")

    contents = app_path / "Contents"
    macos = contents / "MacOS"
    resources = contents / "Resources"
    payload = resources / ".tembro-payload"
    macos.mkdir(parents=True)
    payload.mkdir(parents=True)

    shutil.copytree(DEVICE_DIR, payload / "Tembro")
    stage_variation_runtime(payload, upstream_root or REMOTE_SCRIPT.parent)
    stage_m4l_assets(payload, m4l_source or M4L_SOURCE)
    shutil.copy2(UPSTREAM_LICENSE, payload / "THIRD_PARTY_LICENSE.txt")
    stamp_installer(resources / INSTALLER.name, api_url, version)
    build_icon(resources / "Tembro.icns")

    arch_binaries: list[Path] = []
    module_cache = temp / "SwiftModuleCache"
    module_cache.mkdir()
    for arch in ("arm64", "x86_64"):
        binary = temp / f"TembroInstaller-{arch}"
        run(
            "swiftc",
            "-O",
            "-module-cache-path",
            module_cache,
            "-target",
            f"{arch}-apple-macosx11.0",
            "-framework",
            "AppKit",
            str(INSTALLER_SOURCE),
            "-o",
            binary,
        )
        arch_binaries.append(binary)
    run("lipo", "-create", *arch_binaries, "-output", macos / "TembroInstaller")
    (macos / "TembroInstaller").chmod(0o755)

    info = {
        "CFBundleDevelopmentRegion": "en",
        "CFBundleDisplayName": "Install Tembro",
        "CFBundleExecutable": "TembroInstaller",
        "CFBundleIconFile": "Tembro.icns",
        "CFBundleIdentifier": "com.gettembro.installer",
        "CFBundleInfoDictionaryVersion": "6.0",
        "CFBundleName": "Install Tembro",
        "CFBundlePackageType": "APPL",
        "CFBundleShortVersionString": version.split("-")[0],
        "CFBundleVersion": version.split("-")[0],
        "LSMinimumSystemVersion": "11.0",
        "NSHighResolutionCapable": True,
        "NSHumanReadableCopyright": "Copyright © 2026 Tembro",
        "NSPrincipalClass": "NSApplication",
    }
    with (contents / "Info.plist").open("wb") as handle:
        plistlib.dump(info, handle, sort_keys=True)


def sign(path: Path, identity: str) -> None:
    run(
        "codesign",
        "--force",
        "--options",
        "runtime",
        "--timestamp",
        "--sign",
        identity,
        path,
    )


def build_dmg(
    output: Path,
    api_url: str,
    sign_identity: Optional[str] = None,
    notary_profile: Optional[str] = None,
    upstream_root: Path | None = None,
    version: str = VERSION,
    m4l_source: Path | None = None,
) -> None:
    validate_version(version)
    if version != VERSION:
        raise ValueError("installer version must match devices/Tembro/package.json (" + VERSION + ")")
    if not shutil.which("hdiutil"):
        raise RuntimeError("hdiutil is required to build the macOS disk image")
    if notary_profile and not sign_identity:
        raise RuntimeError("--notary-profile requires --sign-identity")
    build_release(DEVICE_DIR, ZIP_PATH, api_url)
    if (
        not REMOTE_SCRIPT.is_dir()
        or not UPSTREAM_LICENSE.is_file()
        or not ICON_SOURCE.is_file()
    ):
        raise RuntimeError("run setup.sh first so the pinned MCP package is available")

    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="tembro-dmg-") as temp:
        temp_path = Path(temp)
        stage = temp_path / "Tembro"
        stage.mkdir()
        app_path = stage / "Install Tembro.app"
        compile_installer(app_path, temp_path, api_url, upstream_root, version, m4l_source)
        if sign_identity:
            sign(app_path, sign_identity)
        (stage / ".metadata_never_index").touch()

        run(
            "hdiutil",
            "create",
            "-volname",
            f"Tembro {version}",
            "-srcfolder",
            stage,
            "-ov",
            "-format",
            "UDZO",
            output,
        )
        if sign_identity:
            sign(output, sign_identity)

    if notary_profile:
        run(
            "xcrun",
            "notarytool",
            "submit",
            output,
            "--keychain-profile",
            notary_profile,
            "--wait",
        )
        run("xcrun", "stapler", "staple", output)

    print(output)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
    )
    parser.add_argument("--version", default=VERSION, help="Installer version; use a distinct prerelease value for a test build")
    parser.add_argument("--api-url", default="https://gettembro.com")
    parser.add_argument(
        "--variation-upstream-root", type=Path,
        help="Exact unpatched pinned runtime root; defaults to the build .venv site-packages",
    )
    parser.add_argument(
        "--m4l-source", type=Path,
        help="Exact pinned upstream m4l directory (70f7df archive); defaults to the build .venv resources",
    )
    parser.add_argument(
        "--sign-identity",
        help='Developer ID Application identity, for example "Developer ID Application: …"',
    )
    parser.add_argument(
        "--notary-profile",
        help="notarytool keychain profile created with xcrun notarytool store-credentials",
    )
    args = parser.parse_args()
    build_dmg(
        (args.output or DIST / f"Tembro-{validate_version(args.version)}.dmg").resolve(),
        args.api_url,
        args.sign_identity,
        args.notary_profile,
        args.variation_upstream_root.resolve() if args.variation_upstream_root else None,
        args.version,
        args.m4l_source.resolve() if args.m4l_source else None,
    )


if __name__ == "__main__":
    main()
