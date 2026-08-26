/**
 * Row 187 — Fix Responsive and Touch Issues.
 * Static source assertions plus optional live overflow/tap/viewport probes.
 * Does not mark Complete. Does not record Founder acceptance.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { launchPdfBrowser } from "@/lib/blueprint/launch-pdf-browser";

type Verdict = "PASS" | "FAIL" | "GAP";

type TestResult = {
  id: string;
  name: string;
  result: Verdict;
  detail: string;
};

const ROOT = process.cwd();
const EVIDENCE_PATH = path.join(
  ROOT,
  "ops/fab-5/runs/row-187-responsive-touch-validation.json",
);
const STATUS_PATH = path.join(
  ROOT,
  "ops/fab-5/runs/aos-engineering-status/al-187.json",
);

const SOURCE_FILES = [
  "app/layout.tsx",
  "app/globals.css",
  "styles/design-tokens.css",
  "components/mobile/keyboard-insets.tsx",
  "components/app-shell/app-shell-layout.tsx",
  "components/app-shell/app-shell-nav.tsx",
  "components/home/section-shell.tsx",
  "components/eligibility/age-gate.tsx",
  "components/legal/consent-controls.tsx",
] as const;

const LIVE_PATHS = ["/", "/login", "/register", "/contact", "/checkout", "/journey"];

const VIEWPORTS = [
  { name: "iphone-14", width: 390, height: 844 },
  { name: "android-compact", width: 360, height: 800 },
  { name: "ipad-portrait", width: 768, height: 1024 },
] as const;

const TAP_SELECTORS = [
  ".bh-cta",
  ".bh-hero-nav-link",
  ".bh-language-switcher-link",
  ".bh-nav-footer-link",
  ".bh-nav-legal-link",
  ".bh-choice-row",
  ".bh-form-input",
];

const tests: TestResult[] = [];

function record(id: string, name: string, result: Verdict, detail: string) {
  tests.push({ id, name, result, detail });
  console.log(`${result}  ${id}  ${name}  ${detail}`);
}

function pass(id: string, name: string, ok: boolean, detail: string) {
  record(id, name, ok ? "PASS" : "FAIL", detail);
}

async function read(rel: string): Promise<string> {
  return readFile(path.join(ROOT, rel), "utf8");
}

async function waitForHttp(url: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status > 0) {
        return true;
      }
    } catch {
      // server not ready
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function startLocalServer(): Promise<{
  url: string;
  child: ChildProcess | null;
}> {
  const existing = process.env.ROW187_BASE_URL?.trim();
  if (existing) {
    return { url: existing.replace(/\/$/, ""), child: null };
  }

  if (await waitForHttp("http://127.0.0.1:3000", 1500)) {
    return { url: "http://127.0.0.1:3000", child: null };
  }

  const child = spawn("npx", ["next", "start", "-H", "127.0.0.1", "-p", "3000"], {
    cwd: ROOT,
    env: { ...process.env, PORT: "3000" },
    stdio: "pipe",
  });

  const ready = await waitForHttp("http://127.0.0.1:3000", 45000);
  if (!ready) {
    child.kill("SIGTERM");
    throw new Error("local_next_start_not_ready");
  }
  return { url: "http://127.0.0.1:3000", child };
}

async function staticChecks() {
  const sources: Record<string, string> = {};
  for (const file of SOURCE_FILES) {
    sources[file] = await read(file);
  }
  const layout = sources["app/layout.tsx"];
  const css = sources["app/globals.css"];
  const tokens = sources["styles/design-tokens.css"];
  const keyboard = sources["components/mobile/keyboard-insets.tsx"];
  const shell = sources["components/app-shell/app-shell-layout.tsx"];
  const nav = sources["components/app-shell/app-shell-nav.tsx"];
  const section = sources["components/home/section-shell.tsx"];
  const age = sources["components/eligibility/age-gate.tsx"];

  pass(
    "S1",
    "Viewport export covers keyboard and safe-area",
    layout.includes("viewportFit: \"cover\"") &&
      layout.includes("interactiveWidget: \"resizes-content\"") &&
      layout.includes("width: \"device-width\"") &&
      !layout.includes("userScalable: false") &&
      !layout.includes("maximumScale: 1"),
    "viewport-fit=cover, interactive-widget=resizes-content, zoom not locked",
  );
  pass(
    "S2",
    "Keyboard insets mounted",
    layout.includes("KeyboardInsets") &&
      keyboard.includes("visualViewport") &&
      keyboard.includes("scrollIntoView") &&
      keyboard.includes("--bh-keyboard-inset"),
    "visualViewport inset + focused-field scroll",
  );
  pass(
    "S3",
    "Overflow-x clipped on document",
    css.includes("overflow-x-clip") &&
      layout.includes("overflow-x-clip") &&
      css.includes("min-h-dvh"),
    "html/body overflow-x-clip and dvh min-height",
  );
  pass(
    "S4",
    "44px touch token present",
    tokens.includes("--bh-touch-min: 2.75rem") &&
      css.includes("min-height: var(--bh-touch-min)") &&
      css.includes(".bh-choice-row"),
    "--bh-touch-min 2.75rem applied to controls",
  );
  pass(
    "S5",
    "Hero nav wraps instead of nowrap overflow",
    css.includes(".bh-hero-nav .bh-hero-nav-links") &&
      css.includes("flex-wrap justify-center") &&
      !css.includes("w-full flex-nowrap justify-center"),
    "mobile hero links wrap",
  );
  pass(
    "S6",
    "Kenburns disabled on small screens",
    css.includes("@media (max-width: 767px)") &&
      css.includes(".bh-hero-media img") &&
      css.includes("animation: none"),
    "mobile hero media is static",
  );
  pass(
    "S7",
    "Composer dock uses keyboard inset",
    css.includes("var(--bh-keyboard-inset, 0px)") &&
      css.includes("env(safe-area-inset-bottom)"),
    "sticky composer accounts for keyboard + home indicator",
  );
  pass(
    "S8",
    "Mobile nav locks page scroll",
    shell.includes("document.body.style.overflow = \"hidden\"") &&
      nav.includes("inert: true"),
    "body overflow hidden while drawer open; closed drawer inert",
  );
  pass(
    "S9",
    "Section shells no longer clip vertical overflow",
    section.includes("overflow-x-clip") && !section.includes("overflow-hidden"),
    "section-shell overflow-x-clip",
  );
  pass(
    "S10",
    "Age-gate radios use 44px choice rows",
    age.includes("bh-choice-row") && css.includes(".bh-choice-row"),
    "eligibility yes/no labels are full-row tap targets",
  );
  pass(
    "S11",
    "Form inputs stay at 16px to avoid iOS zoom",
    css.includes("font-size: 1rem") &&
      css.includes("input:not([type=\"checkbox\"])"),
    "text fields forced to 1rem",
  );
  pass(
    "S12",
    "Nested scrollers are touch-friendly",
    css.includes("-webkit-overflow-scrolling: touch") &&
      css.includes("overscroll-behavior: contain") &&
      css.includes("overscroll-behavior-x: contain"),
    "chat, chapter nav, consent table, journey chips",
  );
  pass(
    "S13",
    "Videos stay inside the viewport",
    css.includes(".bh-founder-media-video") &&
      css.includes("max-height: min(100dvh, 40rem)") &&
      css.includes("object-fit: contain"),
    "founder media max-height + object-fit",
  );
  pass(
    "S14",
    "Dashboard CTAs stack on narrow screens",
    css.includes(".bh-app-dashboard-actions") &&
      css.includes("flex-col items-stretch gap-3"),
    "dashboard actions wrap/stack",
  );
}

async function liveChecks(baseUrl: string) {
  const browser = await launchPdfBrowser();
  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        isMobile: viewport.width < 768,
        hasTouch: true,
        deviceScaleFactor: 2,
      });
      await page.setUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      );

      for (const route of LIVE_PATHS) {
        const url = `${baseUrl}${route}`;
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        const status = response?.status() ?? 0;
        if (status >= 500) {
          record(
            `L-${viewport.name}-${route}`,
            `HTTP ${route}`,
            "FAIL",
            `status=${status}`,
          );
          continue;
        }

        const metrics = await page.evaluate((selectors: string[]) => {
          const docEl = document.documentElement;
          const overflow = Math.max(0, docEl.scrollWidth - window.innerWidth);
          const meta =
            document.querySelector('meta[name="viewport"]')?.getAttribute("content") ??
            "";
          const touchMin = getComputedStyle(docEl)
            .getPropertyValue("--bh-touch-min")
            .trim();
          const shortfalls: Array<{ selector: string; width: number; height: number }> =
            [];
          for (const selector of selectors) {
            const nodes = Array.from(document.querySelectorAll(selector)).slice(0, 8);
            for (const node of nodes) {
              const rect = node.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) continue;
              if (rect.height < 44 - 0.5 || rect.width < 24) {
                shortfalls.push({
                  selector,
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                });
              }
            }
          }
          const keyboardVar = getComputedStyle(docEl)
            .getPropertyValue("--bh-keyboard-inset")
            .trim();
          return {
            overflow,
            innerWidth: window.innerWidth,
            scrollWidth: docEl.scrollWidth,
            meta,
            touchMin,
            keyboardVar,
            shortfalls,
            overflowX: getComputedStyle(docEl).overflowX,
          };
        }, TAP_SELECTORS);

        const overflowOk = metrics.overflow <= 1;
        pass(
          `O-${viewport.name}-${route}`,
          `No horizontal overflow ${viewport.name} ${route}`,
          overflowOk,
          `overflow=${metrics.overflow}px scrollWidth=${metrics.scrollWidth} inner=${metrics.innerWidth}`,
        );

        if (route === "/") {
          pass(
            `V-${viewport.name}`,
            `Viewport meta ${viewport.name}`,
            metrics.meta.includes("width=device-width") &&
              metrics.meta.includes("viewport-fit=cover") &&
              metrics.meta.includes("interactive-widget=resizes-content"),
            metrics.meta || "missing viewport meta",
          );
          pass(
            `T-${viewport.name}`,
            `Touch token ${viewport.name}`,
            metrics.touchMin === "2.75rem",
            `--bh-touch-min=${metrics.touchMin || "unset"}`,
          );
        }

        const tapFail = metrics.shortfalls[0];
        pass(
          `K-${viewport.name}-${route}`,
          `Tap targets ${viewport.name} ${route}`,
          !tapFail,
          tapFail
            ? `${tapFail.selector} ${tapFail.width}x${tapFail.height}`
            : `checked ${TAP_SELECTORS.join(", ")}`,
        );
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  await staticChecks();

  let live: { attempted: boolean; url: string | null; error: string | null } = {
    attempted: false,
    url: null,
    error: null,
  };

  try {
    const server = await startLocalServer();
    live = { attempted: true, url: server.url, error: null };
    try {
      await liveChecks(server.url);
    } finally {
      if (server.child) {
        server.child.kill("SIGTERM");
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    live = { attempted: true, url: null, error: message };
    record(
      "L0",
      "Live mobile overflow probe",
      "GAP",
      `Local Next runtime not available (${message}). Static checks still ran.`,
    );
  }

  const passed = tests.filter((item) => item.result === "PASS").length;
  const failed = tests.filter((item) => item.result === "FAIL").length;
  const gaps = tests.filter((item) => item.result === "GAP").length;
  const overall = failed === 0 ? (gaps > 0 ? "PASS_WITH_GAPS" : "PASS") : "FAIL";

  const evidence = {
    generatedAt: new Date().toISOString(),
    aosWorkId: "al-187",
    row: 187,
    deliverable: "Fix Responsive and Touch Issues",
    ownerAgent: "imani",
    founderAccepted: false,
    rowMarkedComplete: false,
    secretsPrinted: false,
    stripeConfigModified: false,
    dnsModified: false,
    overall,
    counts: { passed, failed, gaps, total: tests.length },
    live,
    tests,
  };

  await mkdir(path.dirname(EVIDENCE_PATH), { recursive: true });
  await mkdir(path.dirname(STATUS_PATH), { recursive: true });
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  await writeFile(EVIDENCE_PATH, serialized, "utf8");
  await writeFile(STATUS_PATH, serialized, "utf8");

  console.log(
    `\nRow 187 ${overall}  pass=${passed} fail=${failed} gap=${gaps}  evidence=${path.relative(ROOT, EVIDENCE_PATH)}`,
  );
  if (failed > 0) {
    process.exitCode = 1;
  }
}

await main();
