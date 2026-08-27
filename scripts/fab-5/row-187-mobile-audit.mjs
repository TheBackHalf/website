/**
 * Live mobile audit for Row 187. Does not print secrets.
 */
import puppeteer from "puppeteer";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.ROW187_BASE_URL ?? "http://127.0.0.1:3010";
const VIEWPORTS = [
  { name: "iphone-se", width: 320, height: 568 },
  { name: "iphone-14", width: 390, height: 844 },
  { name: "pixel-5", width: 393, height: 851 },
  { name: "tablet", width: 768, height: 1024 },
];
const ROUTES = ["/", "/login", "/register", "/journey", "/contact", "/checkout", "/es"];

const TAP_SELECTOR = [
  "a",
  "button",
  'input[type="submit"]',
  'input[type="button"]',
  ".bh-language-switcher-link",
  ".bh-public-nav-toggle",
  ".bh-cta",
].join(",");

async function auditPage(page, route, viewport) {
  const url = new URL(route, BASE).toString();
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("body", { timeout: 15000 });

  const metrics = await page.evaluate((tapSelector) => {
    const doc = document.documentElement;
    const overflowX = Math.ceil(doc.scrollWidth - window.innerWidth);
    const nowrapHero = Boolean(
      document.querySelector("#hero .bh-hero-subtext") &&
        getComputedStyle(document.querySelector("#hero .bh-hero-subtext")).whiteSpace ===
          "nowrap",
    );
    const toggle = document.querySelector(".bh-public-nav-toggle");
    const toggleRect = toggle?.getBoundingClientRect();
    const toggleOnScreen = Boolean(
      toggle &&
        getComputedStyle(toggle).display !== "none" &&
        toggleRect &&
        toggleRect.width > 0 &&
        toggleRect.left >= -1 &&
        toggleRect.right <= window.innerWidth + 1,
    );
    const toggleVisible = toggleOnScreen;
    const smallTargets = [];
    for (const el of document.querySelectorAll(tapSelector)) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.height + 0.5 < 44 || rect.width + 0.5 < 24) {
        smallTargets.push({
          tag: el.tagName.toLowerCase(),
          className: String(el.className || "").slice(0, 80),
          text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 40),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    }
    return {
      overflowX,
      nowrapHero,
      toggleVisible,
      smallTargets: smallTargets.slice(0, 12),
      smallTargetCount: smallTargets.length,
    };
  }, TAP_SELECTOR);

  if (metrics.toggleVisible && viewport.width < 768) {
    await page.click(".bh-public-nav-toggle");
    await page.waitForSelector(".bh-public-nav-drawer-open", { timeout: 3000 });
    const drawer = await page.evaluate(() => {
      const drawerEl = document.querySelector(".bh-public-nav-drawer-open");
      const first = drawerEl?.querySelector(".bh-public-nav-drawer-link");
      const rect = first?.getBoundingClientRect();
      return {
        open: Boolean(drawerEl),
        firstLinkHeight: rect ? Math.round(rect.height) : 0,
      };
    });
    metrics.drawer = drawer;
    await page.click(".bh-public-nav-toggle");
  }

  return {
    route,
    viewport: viewport.name,
    status: response?.status() ?? 0,
    ...metrics,
    pass:
      (response?.status() ?? 0) < 400 &&
      metrics.overflowX <= 1 &&
      !metrics.nowrapHero &&
      (viewport.width >= 768 || metrics.toggleVisible === true),
  };
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const results = [];
  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 2,
        isMobile: viewport.width < 768,
        hasTouch: true,
      });
      for (const route of ROUTES) {
        results.push(await auditPage(page, route, viewport));
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((item) => !item.pass);
  const report = {
    at: new Date().toISOString(),
    base: BASE,
    passed: results.length - failed.length,
    failed: failed.length,
    results,
  };
  await mkdir("ops/fab-5/runs", { recursive: true });
  await writeFile(
    "ops/fab-5/runs/row-187-mobile-live-audit.json",
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  console.log(`ROW187_LIVE ${report.passed}/${results.length} PASS failed=${failed.length}`);
  for (const item of failed) {
    console.log(
      `FAIL ${item.viewport} ${item.route} overflowX=${item.overflowX} nowrapHero=${item.nowrapHero} toggle=${item.toggleVisible} status=${item.status}`,
    );
  }
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "row187_live_audit_failed");
  process.exit(1);
});
