#!/usr/bin/env python3
"""Build a page-level SQLite FTS knowledge index for the four local PDFs."""

from __future__ import annotations

import hashlib
import json
import sqlite3
from pathlib import Path

from pypdf import PdfReader


KB_ROOT = Path(__file__).resolve().parents[1]
BOOKS_ROOT = KB_ROOT.parent / "books"
INDEX_DIR = KB_ROOT / "index"
DB_PATH = INDEX_DIR / "books.sqlite3"
MANIFEST_PATH = INDEX_DIR / "manifest.json"
OCR_PATH = INDEX_DIR / "book4-tesseract-ocr.json"

SOURCES = {
    "book1.pdf": "An Introduction to Contemporary Music Theory and Complex Systems",
    "book2.pdf": "Dance Music Manual, Fifth Edition",
    "book3.pdf": "The 28 Steps to Electronic Dance Music Production",
    "book4.pdf": "260 Drum Machine Patterns",
}
AUTHORS = {
    "book1.pdf": "Luca Danieli",
    "book2.pdf": "Rick Snoman",
    "book3.pdf": "Melhem Maroun",
    "book4.pdf": "René-Pierre Bardet",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    if DB_PATH.exists():
        DB_PATH.unlink()

    connection = sqlite3.connect(DB_PATH)
    connection.executescript(
        """
        CREATE TABLE pages (
            id INTEGER PRIMARY KEY,
            source_file TEXT NOT NULL,
            title TEXT NOT NULL,
            pdf_page INTEGER NOT NULL,
            text TEXT NOT NULL
        );
        CREATE VIRTUAL TABLE pages_fts USING fts5(
            text,
            content='pages',
            content_rowid='id',
            tokenize='unicode61 remove_diacritics 2'
        );
        """
    )

    ocr_payload = json.loads(OCR_PATH.read_text()) if OCR_PATH.exists() else None
    ocr_pages = {
        int(page["pdf_page"]): page for page in (ocr_payload or {}).get("pages", [])
    }
    manifest = {"schema": 1, "sources": []}
    for filename, fallback_title in SOURCES.items():
        path = BOOKS_ROOT / filename
        reader = PdfReader(path)
        metadata = reader.metadata or {}
        title = str(metadata.get("/Title") or fallback_title)
        author = str(metadata.get("/Author") or AUTHORS[filename])
        extracted_pages = 0
        extracted_chars = 0
        for page_number, page in enumerate(reader.pages, start=1):
            text = (page.extract_text() or "").replace("\x00", " ").strip()
            if filename == "book4.pdf" and page_number in ocr_pages:
                ocr_text = str(ocr_pages[page_number].get("text", "")).strip()
                if ocr_text:
                    text = f"{text}\n\n[Tesseract OCR]\n{ocr_text}".strip()
            connection.execute(
                "INSERT INTO pages(source_file,title,pdf_page,text) VALUES(?,?,?,?)",
                (filename, title, page_number, text),
            )
            extracted_pages += bool(text)
            extracted_chars += len(text)
        source_manifest = {
                "file": filename,
                "title": title,
                "author": author,
                "pages": len(reader.pages),
                "pages_with_text": extracted_pages,
                "extracted_characters": extracted_chars,
                "sha256": sha256(path),
            }
        if filename == "book4.pdf" and ocr_pages:
            confidences = [float(page.get("confidence", 0)) for page in ocr_pages.values()]
            source_manifest["ocr"] = {
                "engine": (ocr_payload or {}).get("engine"),
                "language": (ocr_payload or {}).get("language"),
                "pages": len(ocr_pages),
                "average_confidence": round(sum(confidences) / len(confidences), 2),
            }
        manifest["sources"].append(source_manifest)

    connection.execute("INSERT INTO pages_fts(pages_fts) VALUES('rebuild')")
    connection.commit()
    connection.close()
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"built {DB_PATH}")
    print(f"wrote {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
