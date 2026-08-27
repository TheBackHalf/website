/**
 * Mechanical Row 187 validation for responsive and touch remediations.
 * Does not mark the workbook row Complete. Does not claim Founder acceptance.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type Verdict = "PASS" | "FAIL";

type TestRow = {
  id: string;
  name: string;
  result: Verdict;
  detail: string;
};

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function mark(ok: boolean): Verdict {
  return ok ? "PASS" : "FAIL";
}

function main() {
  const tests: TestRow[] = [];
  const push = (id: string, name: string, ok: boolean, detail: string) => {
    tests.push({ id, name, result: mark(ok), detail });
  };

  const layout = read("app/layout.tsx");
  const globals = read("app/globals.css");
  const tokens = read("styles/design-tokens.css");
  const insets = read("components/site/viewport-insets.tsx");
  const hero = read("components/home/hero-section.tsx");
  const shell = read("components/app-shell/app-shell-layout.tsx");

  push(
    "viewport-export",
    "Root layout exports a Next.js viewport object",
    layout.includes("export const viewport") &&
      layout.includes("viewportFit: \"cover\"") &&
      layout.includes("interactiveWidget: \"resizes-content\""),
    "width=device-width, viewport-fit=cover, interactive-widget=resizes-content",
  );

  push(
    "viewport-insets",
    "Visual viewport keyboard inset is wired into the root layout",
    layout.includes("ViewportInsets") &&
      insets.includes("--bh-keyboard-inset") &&
      insets.includes("visualViewport") &&
      insets.includes("scrollIntoView"),
    "Client hook writes --bh-keyboard-inset and scrolls focused fields into view",
  );

  push(
    "overflow-clip",
    "Document prevents horizontal overflow",
    globals.includes("overflow-x-clip") &&
      globals.includes("-webkit-text-size-adjust: 100%"),
    "html/body overflow-x-clip plus iOS text-size-adjust lock",
  );

  push(
    "tap-targets",
    "Launch-critical controls use a 44px minimum tap target",
    tokens.includes("--bh-touch-min: 2.75rem") &&
      globals.includes("min-h-11") &&
      globals.includes(".bh-language-switcher-link") &&
      globals.includes(".bh-app-mobile-toggle") &&
      globals.includes("size-11") &&
      globals.includes(".bh-app-account-trigger") &&
      globals.includes(".bh-nav-footer-link") &&
      globals.includes(".bh-journey-stage-nav-link"),
    "Language switcher, app toggle, account, footer, journey nav, CTAs",
  );

  push(
    "keyboard-overlap",
    "Sticky composer and form fields respect keyboard inset",
    globals.includes("var(--bh-keyboard-inset") &&
      globals.includes(".bh-lumina-chat-composer-dock") &&
      globals.includes("scroll-margin-bottom"),
    "Lumina dock padding and form scroll-margin use --bh-keyboard-inset",
  );

  push(
    "clipped-text",
    "Hero supporting sentence no longer forces a single nowrap line",
    !hero.includes("lg:whitespace-nowrap") &&
      !/#hero \.bh-hero-subtext[\s\S]{0,160}white-space:\s*nowrap/.test(globals) &&
      hero.includes("bh-hero-subtext") &&
      globals.includes("break-words"),
    "Removed desktop nowrap lock; headings wrap with break-words",
  );

  push(
    "scrolling",
    "Mobile nav locks body scroll and contains overscroll",
    shell.includes("document.body.style.overflow = \"hidden\"") &&
      globals.includes("overscroll-contain") &&
      globals.includes("min-h-dvh"),
    "App drawer scroll lock, overscroll-contain, dvh shells",
  );

  push(
    "media",
    "Embedded media stays inside the viewport",
    globals.includes("max-width: 100%") &&
      globals.includes(".bh-founder-media-video") &&
      globals.includes("max-h-[70dvh]") &&
      globals.includes("object-contain"),
    "Global media max-width plus founder video max-height",
  );

  push(
    "performance",
    "Touch delay and Ken Burns respect reduced motion / manipulation",
    globals.includes("touch-action: manipulation") &&
      globals.includes("prefers-reduced-motion"),
    "touch-action: manipulation on interactive controls; existing reduced-motion gate kept",
  );

  push(
    "no-secrets",
    "Changed files do not contain credential assignment patterns",
    !/((STRIPE|OPENAI|CURSOR|AUTH|POSTGRES|SMTP)_[A-Z0-9_]*\s*=\s*['\"][^'\"]+['\"])/.test(
      [layout, globals, tokens, insets, hero, shell].join("\n"),
    ),
    "No secret-looking assignments in Row 187 files",
  );

  const failed = tests.filter((test) => test.result === "FAIL");
  const result = {
    generatedAt: new Date().toISOString(),
    workId: "al-187",
    row: 187,
    excelRow: 188,
    deliverable: "Fix Responsive and Touch Issues",
    operatingAgent: "imani",
    markedComplete: false,
    founderAcceptance: "open",
    founderAcceptanceAuthority: "Kimberly Walker (human)",
    tests,
    passed: tests.filter((test) => test.result === "PASS").length,
    failed: failed.length,
    total: tests.length,
    readyForReview: failed.length === 0,
  };

  const outDir = path.join(ROOT, "ops/fab-5/runs");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "row-187-responsive-touch-validation.json");
  writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  const statusDir = path.join(outDir, "aos-engineering-status");
  mkdirSync(statusDir, { recursive: true });
  writeFileSync(
    path.join(statusDir, "al-187.json"),
    `${JSON.stringify(
      {
        workId: "al-187",
        source: "command_center August Launch row 187",
        deliverable: "Fix Responsive and Touch Issues",
        operatingAgent: "imani",
        technicalStatus: failed.length === 0 ? "implemented_unmerged" : "validation_failed",
        workbookComplete: false,
        founderAcceptance: "open",
        founderAcceptanceAuthority: "Kimberly Walker (human)",
        dependency: "Mobile Device Testing (row 186) remains open; Nia retest still required",
        validation: {
          script: "npm run fab5:row187",
          passed: result.passed,
          failed: result.failed,
          total: result.total,
          evidence: "ops/fab-5/runs/row-187-responsive-touch-validation.json",
        },
        nextAction: "review_pr_then_nia_device_retest",
        generatedAt: result.generatedAt,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  if (failed.length) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
