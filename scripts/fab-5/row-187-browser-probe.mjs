/**
 * Live mobile probe for Row 187. Requires a running local server.
 */
import puppeteer from "puppeteer";

const ORIGIN = process.env.ROW187_ORIGIN ?? "http://localhost:3000";
const VIEWPORTS = [
  { name: "iphone-14", width: 390, height: 844 },
  { name: "android-compact", width: 360, height: 800 },
];
const PATHS = ["/", "/register", "/login", "/journey", "/eligibility", "/contact", "/es"];

async function main() {
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
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      await page.setUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      );

      for (const pathName of PATHS) {
        await page.goto(`${ORIGIN}${pathName}`, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await page.waitForSelector("body", { timeout: 10000 });
        const result = await page.evaluate(() => {
          const doc = document.documentElement;
          const overflowX = Math.max(0, doc.scrollWidth - window.innerWidth);
          const selectors = [
            "a.bh-hero-nav-link",
            "a.bh-hero-nav-brand",
            "a.bh-language-switcher-link",
            "a.bh-cta",
            "button.bh-cta",
            "a.bh-nav-footer-link",
            "a.bh-nav-legal-link",
            "input.bh-form-input",
            "textarea.bh-form-input",
            "label[for^='bh-age-eligible']",
          ];
          const tapFailures = [];
          for (const selector of selectors) {
            for (const el of Array.from(document.querySelectorAll(selector))) {
              const rect = el.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) continue;
              if (rect.height < 43.5 || rect.width < 24) {
                tapFailures.push(
                  `${selector} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
                );
              }
            }
          }
          const viewportMeta =
            document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? null;
          return { overflowX, tapFailures, viewportMeta };
        });
        findings.push({ path: pathName, viewport: viewport.name, ...result });
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  const overflow = findings.filter((row) => row.overflowX > 1);
  const taps = findings.filter((row) => row.tapFailures.length > 0);
  const viewportOk = findings.every(
    (row) =>
      row.viewportMeta?.includes("width=device-width") &&
      row.viewportMeta?.includes("viewport-fit=cover") &&
      !row.viewportMeta?.includes("user-scalable=no"),
  );

  console.log(JSON.stringify({ overflow, taps, viewportOk, findings }, null, 2));
  if (overflow.length || taps.length || !viewportOk) {
    process.exit(1);
  }
}

await main();
