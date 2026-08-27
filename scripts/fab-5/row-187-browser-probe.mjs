/**
 * Runtime overflow / tap-target / viewport probe for Row 187.
 * Uses the already-built production server on PORT (default 3000).
 */

import puppeteer from "puppeteer";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ORIGIN = process.env.ROW187_ORIGIN ?? "http://localhost:3000";
const VIEWPORTS = [
  { id: "iphone-se", width: 375, height: 667 },
  { id: "iphone-14", width: 390, height: 844 },
  { id: "android-compact", width: 360, height: 800 },
  { id: "pixel-landscape", width: 800, height: 360 },
];
const ROUTES = ["/", "/login", "/register", "/checkout", "/journey", "/contact", "/es"];

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const findings = [];

try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      isMobile: true,
      hasTouch: true,
    });
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );

    for (const route of ROUTES) {
      const url = `${ORIGIN}${route}`;
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      await page.waitForSelector("main, #login-main, #checkout-main, #journey-main, #contact-main", {
        timeout: 10000,
      });
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const overflowX = Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth;
        const viewportMeta = document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? "";
        const tapTargets = [...document.querySelectorAll("a, button")].map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            text: (el.innerText || "").trim().slice(0, 40),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        });
        const undersized = tapTargets.filter(
          (target) =>
            target.width > 0 &&
            target.height > 0 &&
            (target.height < 44 || target.width < 24),
        );
        const nowrapHero = Boolean(
          document.querySelector(".bh-hero-subtext") &&
            getComputedStyle(document.querySelector(".bh-hero-subtext")).whiteSpace === "nowrap",
        );
        return {
          overflowX,
          viewportMeta,
          tapTargetCount: tapTargets.length,
          undersizedCount: undersized.length,
          undersized: undersized.slice(0, 8),
          nowrapHero,
        };
      });

      findings.push({
        viewport: viewport.id,
        route,
        status: response?.status() ?? 0,
        ...metrics,
        pass:
          (response?.status() ?? 0) < 400 &&
          metrics.overflowX <= 1 &&
          !metrics.nowrapHero &&
          metrics.viewportMeta.includes("width=device-width") &&
          metrics.viewportMeta.includes("viewport-fit=cover") &&
          metrics.viewportMeta.includes("interactive-widget=resizes-content"),
      });
    }

    await page.close();
  }
} finally {
  await browser.close();
}

const failed = findings.filter((row) => !row.pass);
const result = {
  generatedAt: new Date().toISOString(),
  origin: ORIGIN,
  passed: findings.filter((row) => row.pass).length,
  failed: failed.length,
  total: findings.length,
  findings,
};

const outDir = path.join(process.cwd(), "ops/fab-5/runs");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  path.join(outDir, "row-187-browser-probe.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);

if (failed.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ passed: result.passed, failed: result.failed, total: result.total }, null, 2));
