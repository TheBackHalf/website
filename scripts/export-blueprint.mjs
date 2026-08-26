#!/usr/bin/env node
/**
 * Row 46 — Export Back Half Blueprint PDFs from print preview routes.
 *
 * Usage:
 *   npm run dev   (in another terminal)
 *   npm run export:blueprint
 *
 * Or with production server:
 *   npm run build && npm run start
 *   BASE_URL=http://localhost:3000 npm run export:blueprint
 */

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "public", "downloads", "blueprint");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

function resolveChromeExecutable() {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  const candidates = [];
  if (fromEnv) candidates.push(fromEnv);
  const programFiles = process.env.PROGRAMFILES || "C:\\Program Files";
  const programFilesX86 =
    process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
  const localAppData = process.env.LOCALAPPDATA || "";
  candidates.push(
    path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
  );
  try {
    const bundled = puppeteer.executablePath();
    if (bundled && existsSync(bundled)) candidates.unshift(bundled);
  } catch {
    // bundled chrome missing in this environment
  }
  return candidates.find((candidate) => candidate && existsSync(candidate));
}

function pdfStats(pdfPath) {
  const script = `
import json, sys
from pathlib import Path
import pymupdf
path = Path(sys.argv[1])
doc = pymupdf.open(path)
info = {
  "pageCount": doc.page_count,
  "bytes": path.stat().st_size,
}
doc.close()
print(json.dumps(info))
`;
  const result = spawnSync("python", ["-c", script, pdfPath], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return { pageCount: null, bytes: null };
  }
  try {
    return JSON.parse(result.stdout.trim().split("\n").at(-1) || "{}");
  } catch {
    return { pageCount: null, bytes: null };
  }
}

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
  const result = spawnSync("python", ["-c", script, pdfPath], {
    encoding: "utf8",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.status !== 0) {
    console.warn("Blank-page strip skipped:", result.stderr || result.error);
  }
}

const exportsList = [
  {
    file: "the-back-half-blueprint.pdf",
    path: "/blueprint/print/guidebook?variant=print",
  },
  {
    file: "back-half-aliveness-index.pdf",
    path: "/blueprint/print/artifacts/aliveness-index",
  },
  {
    file: "back-half-architects-commitment.pdf",
    path: "/blueprint/print/architects-commitment",
  },
  {
    file: "back-half-decision-statement.pdf",
    path: "/blueprint/print/artifacts/decision-statement",
  },
  {
    file: "back-half-standards.pdf",
    path: "/blueprint/print/artifacts/back-half-standards",
  },
  {
    file: "back-half-architect-identity-statement.pdf",
    path: "/blueprint/print/artifacts/architect-identity-statement",
  },
  {
    file: "back-half-expansion-plan.pdf",
    path: "/blueprint/print/artifacts/expansion-plan",
  },
  {
    file: "back-half-declaration.pdf",
    path: "/blueprint/print/artifacts/back-half-declaration",
  },
  {
    file: "back-half-architect-completion-certificate.pdf",
    path: "/blueprint/print/certificate",
  },
];

async function waitForServer(url, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok || response.status === 404) return true;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function main() {
  const ready = await waitForServer(BASE_URL);
  if (!ready) {
    console.error(
      `Cannot reach ${BASE_URL}. Start the dev or production server first.`,
    );
    process.exit(1);
  }

  await mkdir(outputDir, { recursive: true });

  const executablePath = resolveChromeExecutable();
  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 300_000,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    ...(executablePath ? { executablePath } : {}),
  });
  let page = await browser.newPage();
  await page.setDefaultNavigationTimeout(180_000);

  const manifest = [];

  for (const item of exportsList) {
    const url = `${BASE_URL.replace(/\/$/, "")}${item.path}`;
    const outPath = path.join(outputDir, item.file);

    console.log(`Exporting ${item.file}…`);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForSelector(".bh-bp-page", { timeout: 60_000 });
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (error) {
      console.warn(`Retry ${item.file}:`, error?.message ?? error);
      await page.close();
      page = await browser.newPage();
      await page.setDefaultNavigationTimeout(120_000);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForSelector(".bh-bp-page", { timeout: 60_000 });
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
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
      document.querySelectorAll(".bh-bp-page").forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.margin = "0";
          el.style.boxShadow = "none";
        }
      });
    });

    await page.pdf({
      path: outPath,
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
      outline: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    if (item.file === "the-back-half-blueprint.pdf") {
      await stripBlankPdfPages(outPath);
    }

    const stats = pdfStats(outPath);
    manifest.push({
      file: item.file,
      route: item.path,
      url: `/downloads/blueprint/${item.file}`,
      pageCount: stats.pageCount ?? null,
      bytes: stats.bytes ?? null,
    });
  }

  await browser.close();

  await writeFile(
    path.join(outputDir, "manifest.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl: BASE_URL,
        note: "Founder-approved manuscript inserted via Row 46 recovery.",
        manuscriptInserted: true,
        assets: manifest,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`\nExported ${manifest.length} PDFs to public/downloads/blueprint/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
