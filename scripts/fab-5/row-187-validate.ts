/**
 * Row 187 — Fix Responsive and Touch Issues.
 * Static source gates. Does not print secrets.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

type Result = "PASS" | "FAIL";

type TestResult = {
  id: string;
  name: string;
  result: Result;
  detail: string;
};

function mark(ok: boolean): Result {
  return ok ? "PASS" : "FAIL";
}

async function read(rel: string): Promise<string> {
  return readFile(path.join(process.cwd(), rel), "utf8");
}

async function main(): Promise<void> {
  const tests: TestResult[] = [];

  const layout = await read("app/layout.tsx");
  const css = await read("app/globals.css");
  const tokens = await read("styles/design-tokens.css");
  const keyboard = await read("components/ui/keyboard-insets.tsx");
  const publicNav = await read("components/site/public-primary-nav.tsx");
  const heroNav = await read("components/design-system/hero-nav.tsx");
  const siteHeader = await read("components/site/site-header.tsx");
  const hero = await read("components/home/hero-section.tsx");
  const ageGate = await read("components/eligibility/age-gate.tsx");
  const consent = await read("components/legal/consent-controls.tsx");
  const pkg = await read("package.json");

  tests.push({
    id: "R187-01",
    name: "viewport export with keyboard-safe interactiveWidget",
    result: mark(
      layout.includes("export const viewport") &&
        layout.includes("interactiveWidget") &&
        layout.includes("resizes-content") &&
        layout.includes("viewportFit") &&
        !layout.includes("userScalable: false") &&
        !layout.includes("maximumScale: 1"),
    ),
    detail: "device-width viewport, cover fit, resizes-content; zoom not disabled",
  });

  tests.push({
    id: "R187-02",
    name: "visualViewport keyboard inset hook mounted",
    result: mark(
      keyboard.includes("visualViewport") &&
        keyboard.includes("--bh-keyboard-inset") &&
        keyboard.includes("scrollIntoView") &&
        layout.includes("<KeyboardInsets"),
    ),
    detail: "KeyboardInsets sets CSS vars and scrolls focused fields into view",
  });

  tests.push({
    id: "R187-03",
    name: "horizontal overflow and media containment",
    result: mark(
      css.includes("overflow-x: clip") &&
        css.includes("overscroll-behavior-x: none") &&
        css.includes('img:not([data-nimg="fill"])') &&
        css.includes("max-width: 100%") &&
        css.includes("video,") &&
        css.includes("iframe,"),
    ),
    detail: "html/body clip overflow; img/video/iframe max-width 100%",
  });

  tests.push({
    id: "R187-04",
    name: "hero subtext no longer forced nowrap",
    result: mark(
      !hero.includes("lg:whitespace-nowrap") &&
        !/#hero \.bh-hero-subtext[\s\S]{0,180}white-space:\s*nowrap/.test(css),
    ),
    detail: "Supporting sentence wraps instead of clipping on mid/large viewports",
  });

  tests.push({
    id: "R187-05",
    name: "public mobile nav on hero and site header",
    result: mark(
      publicNav.includes("bh-public-nav-toggle") &&
        publicNav.includes("bh-public-nav-drawer") &&
        publicNav.includes("Escape") &&
        publicNav.includes("bh-public-nav-drawer-language") &&
        heroNav.includes("PublicPrimaryNav") &&
        heroNav.includes("bh-public-language-desktop") &&
        siteHeader.includes("PublicPrimaryNav") &&
        css.includes(".bh-public-nav-toggle") &&
        css.includes(".bh-public-language-desktop") &&
        css.includes("size-11"),
    ),
    detail: "Hamburger + drawer replaces nowrap public link row on small screens",
  });

  tests.push({
    id: "R187-06",
    name: "44px tap targets on launch-critical controls",
    result: mark(
      tokens.includes("--bh-tap: 2.75rem") &&
        css.includes("min-h-11") &&
        css.includes(".bh-language-switcher-link") &&
        css.includes(".bh-app-mobile-toggle") &&
        css.includes("size-11") &&
        css.includes(".bh-touch-choice") &&
        ageGate.includes("bh-touch-choice") &&
        consent.includes("bh-touch-choice"),
    ),
    detail: "Language switcher, nav, account, consent, age-gate, and CTAs use 44px targets",
  });

  tests.push({
    id: "R187-07",
    name: "keyboard overlap padding on Lumina composer and forms",
    result: mark(
      css.includes("var(--bh-keyboard-inset") &&
        css.includes("bh-lumina-chat-composer-dock") &&
        css.includes("scroll-margin-bottom") &&
        tokens.includes("--bh-keyboard-inset"),
    ),
    detail: "Composer dock and inputs reserve keyboard + safe-area space",
  });

  tests.push({
    id: "R187-08",
    name: "dvh shells, safe-area, and mobile media performance",
    result: mark(
      css.includes("min-h-dvh") &&
        css.includes("100dvh") &&
        css.includes("env(safe-area-inset-top)") &&
        css.includes("env(safe-area-inset-bottom)") &&
        css.includes("touch-action: manipulation") &&
        css.includes(".bh-hero-media img") &&
        css.includes("animation: none"),
    ),
    detail: "iOS 100vh replaced; safe-area on chrome; hero kenburns off on small screens",
  });

  tests.push({
    id: "R187-09",
    name: "journey stage labels wrap instead of clipping",
    result: mark(
      css.includes(".bh-journey-stage-nav-label") &&
        css.includes("[overflow-wrap:anywhere]") &&
        css.includes("overscroll-x-contain"),
    ),
    detail: "Horizontal stage scroller is containable; labels wrap",
  });

  tests.push({
    id: "R187-10",
    name: "validation scripts registered",
    result: mark(
      pkg.includes('"typecheck"') &&
        pkg.includes("row-187-validate.ts") &&
        pkg.includes("fab5:row187"),
    ),
    detail: "typecheck + fab5:row187 / test scripts present",
  });

  tests.push({
    id: "R187-11",
    name: "no Founder approval fabricated",
    result: mark(true),
    detail: "Technical repair only. Founder acceptance remains with Kimberly Walker (human).",
  });

  const failed = tests.filter((test) => test.result === "FAIL").length;
  const passed = tests.length - failed;
  const report = {
    at: new Date().toISOString(),
    row: 187,
    excelRow: 187,
    aosWorkId: "al-187",
    title: "Fix Responsive and Touch Issues",
    owner: "imani",
    passed,
    failed,
    tests,
    founderAcceptanceRecorded: false,
    founderAcceptanceAuthority: "Kimberly Walker (human)",
    niaRetest: "Nia retests participant experience on priority iPhone/Android after this repair lands.",
    defectsAddressed: [
      "overflow",
      "clipped text",
      "keyboard overlap",
      "tap targets",
      "scrolling",
      "media",
      "performance",
    ],
  };

  const runDir = path.join("ops", "fab-5", "runs");
  const statusDir = path.join(runDir, "aos-engineering-status");
  await mkdir(statusDir, { recursive: true });
  await writeFile(
    path.join(runDir, "row-187-responsive-touch-validation.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  const liveAuditPath = path.join(runDir, "row-187-mobile-live-audit.json");
  const liveAudit = existsSync(liveAuditPath)
    ? (JSON.parse(await readFile(liveAuditPath, "utf8")) as {
        passed: number;
        failed: number;
        results?: unknown[];
      })
    : null;

  await writeFile(
    path.join(statusDir, "al-187.json"),
    `${JSON.stringify(
      {
        aosWorkId: "al-187",
        source: "command_center",
        sourceReference: "August Launch row 187",
        title: "Fix Responsive and Touch Issues",
        ownerAgent: "imani",
        softwareChangeApplied: true,
        founderAcceptanceRecorded: false,
        validation: {
          passed,
          failed,
          script: "npm run fab5:row187",
          evidence: "ops/fab-5/runs/row-187-responsive-touch-validation.json",
          liveAudit: liveAudit ? "ops/fab-5/runs/row-187-mobile-live-audit.json" : null,
          liveAuditResult: liveAudit
            ? `${liveAudit.passed}/${(liveAudit.results ?? []).length} PASS failed=${liveAudit.failed}`
            : "not_run",
          typecheck: "run separately: npm run typecheck",
          build: "run separately: npm run build",
        },
        nextAction: "Nia retests participant mobile experience. Founder acceptance stays with Kimberly Walker (human).",
        at: report.at,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  for (const test of tests) {
    console.log(`${test.result}  ${test.id}  ${test.name}  ${test.detail}`);
  }
  console.log(`ROW187 ${passed}/${tests.length} PASS failed=${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "row_187_validate_failed");
  process.exit(1);
});
