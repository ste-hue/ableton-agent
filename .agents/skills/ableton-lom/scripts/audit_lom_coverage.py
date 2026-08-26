#!/usr/bin/env python3
"""Audit Ableton LOM skill coverage against Cycling '74's LOM reference.

Fetches the official LOM index and each linked object page, extracts all h3
child/property/function API member headings, and verifies that each member name
appears somewhere in this skill's Markdown documentation.
"""

from __future__ import annotations

import html
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://docs.cycling74.com"
INDEX = f"{BASE}/apiref/lom/"


def fetch(url: str) -> str:
    with urllib.request.urlopen(url, timeout=30) as response:  # nosec: audit script
        return response.read().decode("utf-8")


def heading_text(markup: str) -> str:
    text = re.sub(r"<.*?>", "", markup)
    text = html.unescape(text).strip()
    return re.sub(r"\s+", " ", text)


def official_manifest() -> dict[str, list[str]]:
    index_html = fetch(INDEX)
    links = sorted(set(re.findall(r'href="(/apiref/lom/[^"]+/)"', index_html)))
    manifest: dict[str, list[str]] = {}
    for link in links:
        slug = link.strip("/").split("/")[-1]
        page_html = fetch(f"{BASE}{link}")
        members: list[str] = []
        for match in re.finditer(r"<h3[^>]*>(.*?)</h3>", page_html, re.S):
            text = heading_text(match.group(1))
            if text not in {"Resources", "Support", "Communities"}:
                members.append(text)
        manifest[slug] = members
    return manifest


def skill_text() -> str:
    files = [ROOT / "README.md", ROOT / "SKILL.md"] + sorted((ROOT / "references").glob("*.md"))
    return "\n".join(path.read_text() for path in files if path.exists())


def main() -> int:
    manifest = official_manifest()
    docs = skill_text()
    missing: list[tuple[str, str, str]] = []
    for slug, members in manifest.items():
        for heading in members:
            member_name = heading.split()[0]
            if member_name not in docs:
                missing.append((slug, member_name, heading))

    print(json.dumps({"official_pages": len(manifest), "missing_member_names": missing}, indent=2))
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
