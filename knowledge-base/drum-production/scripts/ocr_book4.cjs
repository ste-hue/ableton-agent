#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { createWorker } = require("tesseract.js");


async function main() {
  const [inputPdf, outputJson, python] = process.argv.slice(2);
  if (!inputPdf || !outputJson || !python) {
    throw new Error("usage: ocr_book4.cjs INPUT.pdf OUTPUT.json PYTHON_PATH");
  }

  const outputPath = path.resolve(outputJson);
  const cachePath = path.join(path.dirname(outputPath), "tesseract-cache");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(cachePath, { recursive: true });
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "drum-kb-ocr-"));

  try {
    const renderScript = path.join(__dirname, "render_pdf_pages.py");
    execFileSync(python, [renderScript, path.resolve(inputPdf), tempDir], {
      stdio: ["ignore", "inherit", "inherit"],
    });

    const images = fs.readdirSync(tempDir)
      .filter((name) => name.endsWith(".png"))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const worker = await createWorker("eng", 1, {
      cachePath,
      logger: (message) => {
        if (message.status === "recognizing text" && message.progress === 1) return;
        if (message.status !== "recognizing text") {
          process.stdout.write(`OCR ${message.status} ${Math.round((message.progress || 0) * 100)}%\n`);
        }
      },
    });

    const pages = [];
    for (let index = 0; index < images.length; index += 1) {
      const imagePath = path.join(tempDir, images[index]);
      const result = await worker.recognize(imagePath);
      pages.push({
        pdf_page: index + 1,
        confidence: Math.round(result.data.confidence * 100) / 100,
        text: result.data.text.trim(),
      });
      process.stdout.write(`OCR page ${index + 1}/${images.length}\n`);
    }
    await worker.terminate();

    const payload = {
      engine: "Tesseract.js 7 / Tesseract OCR",
      language: "eng",
      source_file: path.basename(inputPdf),
      page_count: pages.length,
      pages,
    };
    fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
    process.stdout.write(`wrote ${outputPath}\n`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}


main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
