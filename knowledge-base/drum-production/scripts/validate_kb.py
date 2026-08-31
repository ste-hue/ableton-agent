#!/usr/bin/env python3
"""Validate source integrity, page index coverage, and local Markdown links."""

from __future__ import annotations

import hashlib
import json
import re
import sqlite3
from pathlib import Path


KB_ROOT = Path(__file__).resolve().parents[1]
BOOKS_ROOT = KB_ROOT.parent / "books"
INDEX_DIR = KB_ROOT / "index"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    manifest = json.loads((INDEX_DIR / "manifest.json").read_text())
    expected_pages = 0
    for source in manifest["sources"]:
        path = BOOKS_ROOT / source["file"]
        assert path.exists(), f"missing source: {path}"
        assert sha256(path) == source["sha256"], f"source changed: {path}"
        expected_pages += source["pages"]
        if source["file"] == "book4.pdf":
            assert source.get("ocr", {}).get("pages") == source["pages"], "book4 OCR incomplete"

    connection = sqlite3.connect(INDEX_DIR / "books.sqlite3")
    page_count = connection.execute("SELECT count(*) FROM pages").fetchone()[0]
    fts_count = connection.execute("SELECT count(*) FROM pages_fts").fetchone()[0]
    connection.close()
    assert page_count == expected_pages, (page_count, expected_pages)
    assert fts_count == expected_pages, (fts_count, expected_pages)

    link_pattern = re.compile(r"\[[^]]+\]\(([^)]+)\)")
    for markdown in KB_ROOT.rglob("*.md"):
        for target in link_pattern.findall(markdown.read_text(encoding="utf-8")):
            if "://" in target or target.startswith("#"):
                continue
            resolved = (markdown.parent / target.split("#", 1)[0]).resolve()
            assert resolved.exists(), f"broken link in {markdown}: {target}"

    print(f"knowledge base validation: OK ({expected_pages} indexed PDF pages)")


if __name__ == "__main__":
    main()
