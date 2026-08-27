/**
 * Mechanical Row 187 responsive / touch validation.
 * Does not mark the row Complete. Does not invent Founder acceptance.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { readFileSync } from "node:fs";

import { computeKeyboardInset } from "@/lib/responsive/keyboard-inset";

type Verdict = "PASS" | "FAIL";

type TestRow = {
  id: string;
  name: string;
  result: Verdict;
  detail: string;
};

const tests: TestRow[] = [];

function mark(ok: boolean): Verdict {
  return ok ? "PASS" : "FAIL";
}

function push(id: string, name: string, ok: boolean, detail: string) {
  tests.push({ id, name, result: mark(ok), detail });
}

function readRepo(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

async function main(): Promise<void> {
  const layout = readRepo("app/layout.tsx");
  const css = readRepo("app/globals.css");
  const tokens = readRepo("styles/design-tokens.css");
  const insetHook = readRepo("components/responsive/visual-viewport-inset.tsx");
  const insetLib = readRepo("lib/responsive/keyboard-inset.ts");
  const nav = readRepo("components/app-shell/app-shell-nav.tsx");
  const hero = readRepo("components/home/hero-section.tsx");
  const ageGate = readRepo("components/eligibility/age-gate.tsx");

  push(
    "viewport-fit",
    "Root viewport covers safe-area insets",
    /export const viewport/.test(layout) &&
      /viewportFit:\s*"cover"/.test(layout) &&
      /width:\s*"device-width"/.test(layout),
    "viewportFit=cover and device-width",
  );

  push(
    "keyboard-widget",
    "Root viewport resizes content when the software keyboard opens",
    /interactiveWidget:\s*"resizes-content"/.test(layout),
    "interactiveWidget=resizes-content",
  );

  push(
    "zoom-preserved",
    "Pinch-to-zoom is not disabled",
    !/userScalable:\s*false/.test(layout) && !/maximumScale:\s*1/.test(layout),
    "userScalable/maximumScale not locked",
  );

  push(
    "inset-mounted",
    "Visual viewport inset is mounted in the root layout",
    layout.includes("VisualViewportInset") &&
      insetHook.includes("data-bh-row187") &&
      insetHook.includes("computeKeyboardInset"),
    "VisualViewportInset in app/layout.tsx",
  );

  const insetCases: Array<[number, number, number, number]> = [
    [800, 800, 0, 0],
    [800, 500, 0, 300],
    [800, 500, 40, 260],
    [700, 900, 0, 0],
  ];
  const insetOk = insetCases.every(
    ([inner, visual, offset, expected]) =>
      computeKeyboardInset(inner, visual, offset) === expected,
  );
  push(
    "inset-math",
    "Keyboard inset math covers iOS visualViewport shrink",
    insetOk && insetLib.includes("computeKeyboardInset"),
    insetOk ? "0 / 300 / 260 / 0" : "inset cases failed",
  );

  push(
    "overflow-clip",
    "Document root clips horizontal overflow",
    /html \{[\s\S]*overflow-x:\s*clip/.test(css) &&
      /body \{[\s\S]*overflow-x:\s*clip/.test(css),
    "html/body overflow-x: clip",
  );

  push(
    "tap-targets",
    "Launch-critical controls use a 44px tap floor",
    tokens.includes("--bh-touch-min") &&
      css.includes("size-11") &&
      css.includes("min-h-11") &&
      /bh-language-switcher-link \{[\s\S]*min-h-11/.test(css) &&
      /bh-onboarding-rating \{[\s\S]*min-h-11/.test(css) &&
      /bh-chapter-1-nav-link \{[\s\S]*min-h-11/.test(css) &&
      ageGate.includes("min-h-11"),
    "44px floor on nav, switcher, ratings, chapter, age gate",
  );

  push(
    "keyboard-dock",
    "Lumina composer dock tracks keyboard inset",
    /bh-lumina-chat-composer-dock \{[\s\S]*bottom:\s*var\(--bh-keyboard-inset/.test(
      css,
    ),
    "composer dock bottom uses --bh-keyboard-inset",
  );

  push(
    "scroll-lock",
    "Architect mobile nav locks background scroll",
    nav.includes('html.style.overflow = "hidden"') &&
      nav.includes('body.style.overflow = "hidden"'),
    "html/body overflow hidden while open",
  );

  push(
    "nowrap-wide-only",
    "Hero supporting sentence wraps below 1280px",
    /min-width:\s*1280px/.test(css) &&
      hero.includes("xl:whitespace-nowrap") &&
      !hero.includes("lg:whitespace-nowrap"),
    "nowrap at xl / 1280px only",
  );

  push(
    "media-bounds",
    "Replaced media cannot overflow the content box",
    /img,\s*video,\s*canvas \{[\s\S]*max-width:\s*100%/.test(css),
    "img/video/canvas max-width 100%",
  );

  push(
    "mobile-performance",
    "Hero kenburns is disabled on small viewports",
    /@media \(max-width: 767px\) \{[\s\S]*bh-hero-media img[\s\S]*animation:\s*none/.test(
      css,
    ),
    "mobile hero animation: none",
  );

  push(
    "safe-area",
    "Notch and home-indicator safe areas are applied",
    css.includes("env(safe-area-inset-top)") &&
      css.includes("env(safe-area-inset-bottom)") &&
      tokens.includes("--bh-keyboard-inset"),
    "safe-area-inset + keyboard token",
  );

  const failed = tests.filter((test) => test.result === "FAIL");
  const payload = {
    generatedAt: new Date().toISOString(),
    row: 187,
    aosWorkId: "al-187",
    deliverable: "Fix Responsive and Touch Issues",
    primaryOwner: "imani",
    supportingOwners: ["nia"],
    technicalStatus: failed.length === 0 ? "ready_for_retest" : "failed",
    percentCompleteRecorded: failed.length === 0 ? 80 : 40,
    rowMarkedComplete: false,
    founderAcceptance: null,
    founderAcceptanceAuthority: "Kimberly Walker (human)",
    nextAction:
      "Nia retests participant experience on priority iPhone/Android sizes. Founder acceptance remains open.",
    liveVisualPassClaimed: false,
    productionRuntimeProofClaimed: false,
    dependency: "Mobile Device Testing (row 186) remains a workbook dependency.",
    passed: tests.filter((test) => test.result === "PASS").length,
    failed: failed.length,
    tests,
    defectsAddressed: [
      "horizontal overflow",
      "clipped hero/nav text at tablet widths",
      "software keyboard overlap",
      "sub-44px tap targets",
      "background scroll under mobile nav",
      "media overflow",
      "mobile hero animation cost",
    ],
    note:
      "Mechanical source proof only. Does not replace Nia participant retest or Founder acceptance.",
  };

  const outDir = path.join("ops", "fab-5", "runs");
  await mkdir(outDir, { recursive: true });
  await writeFile(
    path.join(outDir, "row-187-responsive-touch-validation.json"),
    JSON.stringify(payload, null, 2),
    "utf8",
  );

  for (const test of tests) {
    console.log(`${test.result}  ${test.id}  ${test.name}  ${test.detail}`);
  }

  if (failed.length > 0) {
    console.error(`ROW187_VALIDATION ${payload.passed}/${tests.length} FAIL`);
    process.exit(1);
  }

  console.log(`ROW187_VALIDATION ${payload.passed}/${tests.length} PASS`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "row187_validate_failed";
  console.error(message);
  process.exit(1);
});
