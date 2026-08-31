#!/usr/bin/env python3
"""Render every PDF page to grayscale PNG for OCR using PDFium."""

from __future__ import annotations

import sys
from pathlib import Path

import pypdfium2 as pdfium


source = Path(sys.argv[1])
output_dir = Path(sys.argv[2])
output_dir.mkdir(parents=True, exist_ok=True)
document = pdfium.PdfDocument(source)
for index, page in enumerate(document, start=1):
    bitmap = page.render(scale=1.5, grayscale=True)
    image = bitmap.to_pil()
    image.save(output_dir / f"page-{index:03d}.png", optimize=True)
print(f"rendered {len(document)} pages")

