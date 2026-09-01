#!/usr/bin/env python3
"""Build the single-file macOS beta installer disk image for Tembro."""

from __future__ import annotations

import argparse
import plistlib
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional, Union

from PIL import Image

from build_tembro_release import REPO, build as build_release


VERSION = "0.1.4-beta"
DIST = REPO / "dist"
DEVICE_DIR = DIST / "Tembro"
ZIP_PATH = DIST / "Tembro-v0-mac.zip"
INSTALLER = REPO / "installer" / "Install Tembro.command"
INSTALLER_SOURCE = REPO / "installer" / "TembroInstaller.swift"
ICON_SOURCE = REPO / "assets" / "brand" / "tembro-icon.png"
REMOTE_SCRIPT = (
    REPO
    / ".venv"
    / "lib"
    / "python3.12"
    / "site-packages"
    / "Ableton_Live_MCP"
)
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


def compile_installer(app_path: Path, temp: Path) -> None:
    if not shutil.which("swiftc") or not shutil.which("lipo"):
        raise RuntimeError("swiftc and lipo are required to build the installer app")

    contents = app_path / "Contents"
    macos = contents / "MacOS"
    resources = contents / "Resources"
    payload = resources / ".tembro-payload"
    macos.mkdir(parents=True)
    payload.mkdir(parents=True)

    shutil.copytree(DEVICE_DIR, payload / "Tembro")
    shutil.copytree(REMOTE_SCRIPT, payload / "Ableton_Live_MCP")
    shutil.copy2(UPSTREAM_LICENSE, payload / "THIRD_PARTY_LICENSE.txt")
    shutil.copy2(INSTALLER, resources / INSTALLER.name)
    (resources / INSTALLER.name).chmod(0o755)
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
        "CFBundleShortVersionString": VERSION.removesuffix("-beta"),
        "CFBundleVersion": "3",
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
) -> None:
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
        compile_installer(app_path, temp_path)
        if sign_identity:
            sign(app_path, sign_identity)
        (stage / ".metadata_never_index").touch()

        run(
            "hdiutil",
            "create",
            "-volname",
            f"Tembro {VERSION}",
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
        default=DIST / f"Tembro-{VERSION}.dmg",
    )
    parser.add_argument("--api-url", default="https://gettembro.com")
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
        args.output.resolve(),
        args.api_url,
        args.sign_identity,
        args.notary_profile,
    )


if __name__ == "__main__":
    main()
