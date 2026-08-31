#!/usr/bin/env python3
"""Search the drum-production PDF knowledge index."""

from __future__ import annotations

import argparse
import re
import sqlite3
from pathlib import Path


KB_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = KB_ROOT / "index" / "books.sqlite3"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query")
    parser.add_argument("--source", choices=[f"book{i}.pdf" for i in range(1, 5)])
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--all", action="store_true", help="require all query terms")
    args = parser.parse_args()

    terms = re.findall(r"[^\W_]+", args.query, flags=re.UNICODE)
    if not terms:
        parser.error("query must contain at least one searchable word")
    operator = " AND " if args.all else " OR "
    fts_query = operator.join('"' + term.replace('"', '""') + '"' for term in terms)

    connection = sqlite3.connect(DB_PATH)
    sql = """
        SELECT p.title, p.source_file, p.pdf_page,
               snippet(pages_fts, 0, '[', ']', ' ... ', 28),
               bm25(pages_fts)
        FROM pages_fts
        JOIN pages p ON p.id = pages_fts.rowid
        WHERE pages_fts MATCH ?
    """
    parameters: list[object] = [fts_query]
    if args.source:
        sql += " AND p.source_file = ?"
        parameters.append(args.source)
    sql += " ORDER BY bm25(pages_fts) LIMIT ?"
    parameters.append(max(1, min(args.limit, 50)))

    rows = connection.execute(sql, parameters).fetchall()
    connection.close()
    if not rows:
        print("No results.")
        return
    for title, source, page, snippet, _score in rows:
        print(f"{source} - PDF page {page} - {title}")
        print("  " + " ".join(snippet.split()))


if __name__ == "__main__":
    main()
