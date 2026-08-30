#!/usr/bin/env python3
"""Build the portable Tembro Max for Live download bundle.

Run from the repository root after setup.sh has created .venv and installed the
pinned ableton-live-mcp package. The output folder is ready to copy into Live's
User Library; the ZIP is ready to attach to a release or Lemon Squeezy product.
"""

from __future__ import annotations

import argparse
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
INSTALL_GUIDE = REPO / "devices" / "Tembro" / "INSTALL.md"


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
        }
    ]
    return patch


def build(output_dir: Path, zip_path: Path, api_url: str | None = None) -> None:
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

    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for source in sorted(output_dir.iterdir()):
            if source.is_file():
                archive.write(source, Path("Tembro") / source.name)

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
