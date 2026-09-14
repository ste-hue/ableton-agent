#!/usr/bin/env python3
"""Build the portable Tembro Max for Live download bundle.

Run from the repository root after setup.sh has created .venv and installed the
pinned ableton-live-mcp package. The output folder is ready to copy into Live's
User Library; the ZIP is ready to attach to a release or Lemon Squeezy product.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import urlparse

from agent_m4l import build_amxd, extract_ptch_chunk


REPO = Path(__file__).resolve().parents[1]
SOURCE_PATCH = REPO / "devices" / "Tembro" / "Tembro.maxpat"
CODE_DIR = REPO / "devices" / "Tembro" / "code"
BRIDGE_DIR = REPO / "devices" / "Tembro" / "bridge"
REQUIRED_CODE = (
    "tembro_main.js", "clip_variation.js", "runtime_preflight.js",
    "musical_engines.js", "chordarium_engine.js", "rudiment_engine.js",
)
REQUIRED_BRIDGE = ("patch_runtime.py", "variation_runtime.py")
# Reviewed with the adapters' engine pins. Keep the exact manifest and trusted
# Chordarium pin/runtime together; release building never executes engine code.
# Updating an engine requires updating these hashes after its parity tests pass.
ENGINE_ASSETS = {
    "chordarium/engine.generated.js": "348a35635958ae4662184e10831472aab0421bf5ec04b59fc98a5097fafba6db",
    "chordarium/manifest.json": "cdb19eba18338ad49d2ac0a9e89ecff67e3d5c72bb1aad532f81d90f11a8637b",
    "chordarium/pin.js": "f5ab1a81882a60b5a8b4516a1ba9db13f492a547d187da46f639492a3f4f5eee",
    "chordarium/runtime.js": "9bcdcf4330c3b162b5d0a5996646decd3645ba919699593fe0d5ebdee65d69be",
    "rudiment/engine.bundle.js": "57b6ee87717eab58c51d68036697be454c28c76a7edd22d78a6896729112a387",
    "rudiment/manifest.json": "be32eeec733a0378bd438c5211e34bfd7e7213d323c0c490924c9734a6960210",
}
INSTALL_GUIDE = REPO / "devices" / "Tembro" / "INSTALL.md"
UI_ASSETS = [
    REPO / "devices" / "Tembro" / "tembro_ui.html",
    REPO / "devices" / "Tembro" / "tembro_window.js",
]


def checked_engine_assets() -> dict[str, bytes]:
    """Read and verify all assets before writing any part of the release."""
    directory = CODE_DIR / "engines"
    assets = {}
    for relative, expected_hash in ENGINE_ASSETS.items():
        source = directory / relative
        if directory.is_symlink() or source.parent.is_symlink() or source.is_symlink() or not source.is_file():
            raise RuntimeError("required engine release asset is missing or linked: " + relative)
        if source.stat().st_size > 2 * 1024 * 1024:
            raise RuntimeError("engine release asset exceeds the size limit: " + relative)
        data = source.read_bytes()
        if hashlib.sha256(data).hexdigest() != expected_hash:
            raise RuntimeError("engine release asset does not match its reviewed pin: " + relative)
        assets[relative] = data
    return assets


def check_engine_destination(output_dir: Path) -> None:
    # A reused output folder must not smuggle old fixtures or symlinks into the
    # recursive ZIP below, or redirect writes away from the release folder.
    directory = output_dir / "engines"
    if directory.is_symlink() or (directory.exists() and not directory.is_dir()):
        raise RuntimeError("engine release destination must be a regular directory")
    allowed_dirs = {Path(name).parent.as_posix() for name in ENGINE_ASSETS}
    for entry in directory.rglob("*"):
        relative = entry.relative_to(directory).as_posix()
        if entry.is_symlink() or (entry.is_dir() and relative not in allowed_dirs) or \
                (not entry.is_dir() and relative not in ENGINE_ASSETS):
            raise RuntimeError("unexpected existing engine release asset; use a clean output folder: " + relative)


def release_patch() -> dict:
    patch = json.loads(SOURCE_PATCH.read_text(encoding="utf-8"))
    for item in patch["patcher"]["boxes"]:
        box = item.get("box", {})
        if box.get("id") == "obj-node":
            # Max resolves node.script files reliably when the script sits next
            # to the AMXD inside a User Library folder. The source tree keeps
            # JavaScript under code/, while the customer bundle is flattened.
            box["text"] = "node.script tembro_main.js @autostart 0 @watch 0"
            box.setdefault("saved_object_attributes", {})["autostart"] = 0
            box.pop("textfile", None)
            break
    else:
        raise RuntimeError("Tembro patch is missing obj-node")

    patch["patcher"]["dependency_cache"] = [
        {
            "name": "tembro_main.js",
            "bootpath": ".",
            "patcherrelativepath": ".",
            "type": "TEXT",
            "implicit": 1,
        },
        {
            "name": "tembro_ui.html",
            "bootpath": ".",
            "patcherrelativepath": ".",
            "type": "TEXT",
            "implicit": 1,
        },
        {
            "name": "tembro_window.js",
            "bootpath": ".",
            "patcherrelativepath": ".",
            "type": "TEXT",
            "implicit": 1,
        },
    ]
    return patch


def build(output_dir: Path, zip_path: Path, api_url: str | None = None) -> None:
    for directory, names in ((CODE_DIR, REQUIRED_CODE), (BRIDGE_DIR, REQUIRED_BRIDGE)):
        for name in names:
            if not (directory / name).is_file():
                raise RuntimeError("required Tembro runtime release file is missing: " + name)
    engine_assets = checked_engine_assets()
    check_engine_destination(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    patch = release_patch()

    if api_url:
        parsed = urlparse(api_url)
        if parsed.scheme != "https" or not parsed.netloc:
            raise ValueError("--api-url must be an absolute HTTPS URL")
        api_url = api_url.rstrip("/")

    with tempfile.TemporaryDirectory(prefix="tembro-build-") as temp:
        source = Path(temp) / "Tembro.maxpat"
        source.write_text(json.dumps(patch, indent=2) + "\n", encoding="utf-8")
        build_amxd(source, output_dir / "Tembro.amxd", "midi_effect")

    for source in sorted(CODE_DIR.glob("*.js")):
        content = source.read_text(encoding="utf-8")
        if source.name == "tembro_main.js" and api_url:
            content = content.replace(
                'cfg.api_base || "http://127.0.0.1:8787"',
                f'cfg.api_base || "{api_url}"',
            )
        (output_dir / source.name).write_text(content, encoding="utf-8")
    for relative, data in engine_assets.items():
        target = output_dir / "engines" / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    for source in UI_ASSETS:
        shutil.copy2(source, output_dir / source.name)
    (output_dir / "bridge").mkdir(exist_ok=True)
    for name in REQUIRED_BRIDGE:
        shutil.copy2(BRIDGE_DIR / name, output_dir / "bridge" / name)
    guide = INSTALL_GUIDE.read_text(encoding="utf-8").replace(
        "{{TEMBRO_API_URL}}",
        api_url or "http://127.0.0.1:8787 (local development)",
    )
    (output_dir / "README.md").write_text(guide, encoding="utf-8")

    embedded = json.loads(
        extract_ptch_chunk((output_dir / "Tembro.amxd").read_bytes()).rstrip(b"\x00")
    )
    node_box = next(
        item["box"]
        for item in embedded["patcher"]["boxes"]
        if item["box"].get("id") == "obj-node"
    )
    if node_box.get("text") != "node.script tembro_main.js @autostart 0 @watch 0":
        raise RuntimeError("release AMXD contains an unexpected node.script path")
    chat_box = next(
        item["box"]
        for item in embedded["patcher"]["boxes"]
        if item["box"].get("id") == "obj-chat-patcher"
    )
    web_box = next(
        item["box"]
        for item in chat_box["patcher"]["boxes"]
        if item["box"].get("id") == "chat-web"
    )
    if web_box.get("url") != "file://tembro_ui.html":
        raise RuntimeError("release AMXD contains an unexpected chat UI path")

    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for source in sorted(output_dir.rglob("*")):
            if source.is_file():
                archive.write(source, Path("Tembro") / source.relative_to(output_dir))

    print(output_dir)
    print(zip_path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=REPO / "dist" / "Tembro",
        help="Folder containing the installable Tembro bundle",
    )
    parser.add_argument(
        "--zip-path",
        type=Path,
        default=REPO / "dist" / "Tembro-v0-mac.zip",
        help="ZIP written for release/Lemon Squeezy upload",
    )
    parser.add_argument(
        "--api-url",
        help="Production HTTPS API URL embedded as the device default",
    )
    args = parser.parse_args()
    build(args.output_dir.resolve(), args.zip_path.resolve(), args.api_url)


if __name__ == "__main__":
    main()
