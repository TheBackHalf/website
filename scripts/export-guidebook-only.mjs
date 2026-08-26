#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "public", "downloads", "blueprint");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3005";
const outPath = path.join(outputDir, "the-back-half-blueprint.pdf");

function stripBlankPdfPages(pdfPath) {
  const script = `
import sys
from pathlib import Path
import pymupdf
path = Path(sys.argv[1])
doc = pymupdf.open(path)
keep = [i for i, p in enumerate(doc) if p.get_text('text').strip()]
if len(keep) == len(doc):
    doc.close()
    raise SystemExit(0)
out = pymupdf.open()
for i in keep:
    out.insert_pdf(doc, from_page=i, to_page=i)
doc.close()
out.save(path, deflate=True, garbage=4)
out.close()
print(f'Stripped blank pages -> {len(keep)} pages')
`;
  const result = spawnSync("python", ["-c", script, pdfPath], { encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
}

const ready = await (async () => {
  for (let i = 0; i < 30; i += 1) {
    try {
      const response = await fetch(BASE_URL, { method: "HEAD" });
      if (response.ok || response.status === 404) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
})();

if (!ready) {
  console.error(`Cannot reach ${BASE_URL}`);
  process.exit(1);
}

await mkdir(outputDir, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 300_000,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setDefaultNavigationTimeout(120_000);
const url = `${BASE_URL.replace(/\/$/, "")}/blueprint/print/guidebook?variant=print`;
console.log(`Exporting guidebook from ${url}`);
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
await page.waitForSelector(".bh-bp-page", { timeout: 60_000 });
await new Promise((r) => setTimeout(r, 1500));
await page.emulateMediaType("print");
await page.evaluate(() => {
  document
    .querySelectorAll(".bh-bp-screen-notice")
    .forEach((el) => el.remove());
  const shell = document.querySelector(".bh-bp-production-root");
  if (shell instanceof HTMLElement) {
    shell.style.padding = "0";
    shell.style.margin = "0";
    shell.style.background = "transparent";
    shell.style.minHeight = "0";
  }
  const root = document.querySelector(".bh-bp-document");
  if (root instanceof HTMLElement) {
    root.style.background = "transparent";
    root.style.margin = "0";
    root.style.padding = "0";
  }
});
await page.pdf({
  path: outPath,
  format: "Letter",
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});
await browser.close();
stripBlankPdfPages(outPath);
console.log(`Wrote ${outPath}`);
