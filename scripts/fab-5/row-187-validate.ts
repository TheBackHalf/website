/**
 * Mechanical Row 187 validation — responsive and touch fixes.
 * Does not mark the Command Center row Complete.
 * Does not claim Founder acceptance.
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { launchViewport } from "@/lib/responsive/viewport";
import { keyboardInsetPx } from "@/lib/responsive/visual-viewport";

type Verdict = "PASS" | "FAIL";

type TestRow = {
  id: string;
  name: string;
  result: Verdict;
  detail: string;
};

function mark(ok: boolean): Verdict {
  return ok ? "PASS" : "FAIL";
}

function read(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

function has(rel: string): boolean {
  return existsSync(path.join(process.cwd(), rel));
}

const rows: TestRow[] = [];

function check(id: string, name: string, ok: boolean, detail: string) {
  rows.push({ id, name, result: mark(ok), detail });
}

function mainSync() {
  check(
    "keyboard-closed",
    "No keyboard inset when visual viewport matches layout",
    keyboardInsetPx(800, 800, 0) === 0,
    `inset=${keyboardInsetPx(800, 800, 0)}`,
  );
  check(
    "keyboard-open",
    "Keyboard inset equals covered layout height",
    keyboardInsetPx(800, 480, 0) === 320,
    `inset=${keyboardInsetPx(800, 480, 0)}`,
  );
  check(
    "keyboard-offset-top",
    "iOS visualViewport.offsetTop is subtracted",
    keyboardInsetPx(800, 480, 40) === 280,
    `inset=${keyboardInsetPx(800, 480, 40)}`,
  );
  check(
    "keyboard-invalid",
    "Non-finite viewport metrics yield 0 inset",
    keyboardInsetPx(Number.NaN, 480, 0) === 0,
    "NaN guarded",
  );

  check(
    "viewport-file",
    "Launch viewport module exists",
    has("lib/responsive/viewport.ts"),
    "lib/responsive/viewport.ts",
  );
  check(
    "viewport-zoom",
    "Pinch-zoom remains enabled",
    launchViewport.userScalable !== false && launchViewport.maximumScale !== 1,
    JSON.stringify({
      userScalable: launchViewport.userScalable ?? "default",
      maximumScale: launchViewport.maximumScale ?? "default",
    }),
  );
  check(
    "viewport-keyboard",
    "interactive-widget resizes content for software keyboard",
    launchViewport.interactiveWidget === "resizes-content",
    String(launchViewport.interactiveWidget),
  );
  check(
    "viewport-safe-area",
    "viewport-fit cover enables safe-area insets",
    launchViewport.viewportFit === "cover",
    String(launchViewport.viewportFit),
  );

  const layout = has("app/layout.tsx") ? read("app/layout.tsx") : "";
  check(
    "layout-viewport-export",
    "Root layout exports the launch viewport",
    layout.includes("export const viewport") && layout.includes("launchViewport"),
    "app/layout.tsx viewport export",
  );
  check(
    "layout-insets",
    "Root layout mounts VisualViewportInsets",
    layout.includes("VisualViewportInsets"),
    "VisualViewportInsets in app/layout.tsx",
  );

  const css = has("app/globals.css") ? read("app/globals.css") : "";
  check(
    "overflow-clip",
    "Document clips horizontal overflow",
    css.includes("overflow-x: clip"),
    "html/body overflow-x: clip",
  );
  check(
    "tap-min-token",
    "44px tap-target token is defined",
    css.includes("--bh-tap-min") || read("styles/design-tokens.css").includes("--bh-tap-min: 2.75rem"),
    "--bh-tap-min",
  );
  check(
    "tap-nav",
    "Primary nav/header links use 44px tap targets",
    css.includes(".bh-hero-nav-link") &&
      css.includes("min-h-11") &&
      css.includes(".bh-language-switcher-link") &&
      css.includes(".bh-app-mobile-toggle"),
    "nav, language switcher, mobile toggle",
  );
  check(
    "keyboard-css",
    "Composer dock and inputs use --bh-keyboard-inset",
    css.includes("var(--bh-keyboard-inset") &&
      css.includes("scroll-margin-bottom") &&
      css.includes(".bh-lumina-chat-composer-dock"),
    "composer dock + form scroll-margin",
  );
  const heroSubtextBlock = css.slice(
    css.indexOf("#hero .bh-hero-subtext"),
    css.indexOf("#hero .bh-hero-subtext") + 280,
  );
  check(
    "no-hero-nowrap",
    "Hero supporting sentence is allowed to wrap",
    css.includes("#hero .bh-hero-subtext") &&
      !heroSubtextBlock.includes("white-space: nowrap") &&
      !heroSubtextBlock.includes("whitespace-nowrap"),
    "nowrap removed from #hero .bh-hero-subtext",
  );
  check(
    "hero-dvh",
    "Hero uses dynamic viewport height",
    css.includes("min-h-dvh"),
    "bh-hero min-h-dvh",
  );
  check(
    "touch-scroll",
    "Horizontal and chat scrollers use touch momentum",
    css.includes("-webkit-overflow-scrolling: touch"),
    "journey nav + lumina scroll",
  );
  const journeyLabelBlock = css.slice(
    css.indexOf(".bh-journey-stage-nav-label"),
    css.indexOf(".bh-journey-stage-nav-label") + 420,
  );
  check(
    "journey-label-wrap",
    "Journey stage labels wrap as words, not characters",
    journeyLabelBlock.includes("overflow-wrap: normal") &&
      journeyLabelBlock.includes("word-break: normal") &&
      !journeyLabelBlock.includes("overflow-wrap:anywhere") &&
      !journeyLabelBlock.includes("[overflow-wrap:anywhere]"),
    "bh-journey-stage-nav-label",
  );
  check(
    "media-max-width",
    "Embedded media cannot overflow the viewport",
    css.includes("img,") && css.includes("max-width: 100%"),
    "img/video/iframe max-width",
  );
  check(
    "mobile-perf",
    "Hero kenburns is disabled on small screens",
    css.includes(".bh-hero-media img") && css.includes("animation: none"),
    "phone GPU/battery",
  );
  check(
    "scroll-lock",
    "Body scroll lock class exists for mobile nav",
    css.includes(".bh-scroll-locked"),
    "bh-scroll-locked",
  );

  const hero = has("components/home/hero-section.tsx")
    ? read("components/home/hero-section.tsx")
    : "";
  check(
    "hero-subtext-wrap",
    "Hero markup no longer forces nowrap",
    !hero.includes("whitespace-nowrap"),
    "components/home/hero-section.tsx",
  );

  const shell = has("components/home/section-shell.tsx")
    ? read("components/home/section-shell.tsx")
    : "";
  check(
    "section-overflow",
    "Section shells clip x-overflow without clipping vertical text",
    shell.includes("overflow-x-clip") && !shell.includes("overflow-hidden"),
    "components/home/section-shell.tsx",
  );

  const appShell = has("components/app-shell/app-shell-layout.tsx")
    ? read("components/app-shell/app-shell-layout.tsx")
    : "";
  check(
    "app-scroll-lock",
    "Architect mobile nav locks background scroll",
    appShell.includes("bh-scroll-locked"),
    "AppShellLayout",
  );

  const composer = has("components/lumina/chat/lumina-composer.tsx")
    ? read("components/lumina/chat/lumina-composer.tsx")
    : "";
  check(
    "composer-focus",
    "Lumina composer scrolls focused field into view",
    composer.includes("scrollIntoView"),
    "LuminaComposer onFocus",
  );

  const ageGate = has("components/eligibility/age-gate.tsx")
    ? read("components/eligibility/age-gate.tsx")
    : "";
  check(
    "age-gate-tap",
    "Age-gate choices use 44px labels and 24px radios",
    ageGate.includes("min-h-11") && ageGate.includes("size-6"),
    "age-gate labels",
  );

  check(
    "no-zoom-lock",
    "Security/accessibility: zoom is not disabled",
    launchViewport.userScalable !== false &&
      launchViewport.maximumScale !== 1 &&
      !layout.includes("userScalable: false") &&
      !layout.includes("user-scalable=no"),
    "viewport zoom remains available",
  );
}

async function main() {
  mainSync();
  const failed = rows.filter((row) => row.result === "FAIL");
  const evidence = {
    row: 187,
    aosWorkId: "al-187",
    deliverable: "Fix Responsive and Touch Issues",
    ownerAgent: "imani",
    generatedAt: new Date().toISOString(),
    founderAcceptance: "required_not_claimed",
    commandCenterStatusClaim: "not_marked_complete",
    summary: {
      total: rows.length,
      passed: rows.filter((row) => row.result === "PASS").length,
      failed: failed.length,
    },
    checks: rows,
    nextAction: "Nia retests participant experience. Founder acceptance stays with Kimberly Walker (human).",
  };

  const outDir = path.join(process.cwd(), "ops/fab-5/runs");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "row-187-responsive-touch-validation.json");
  await writeFile(outPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  if (failed.length > 0) {
    console.error(`Row 187 validation FAILED (${failed.length}/${rows.length})`);
    for (const row of failed) {
      console.error(`- ${row.id}: ${row.detail}`);
    }
    process.exit(1);
  }

  console.log(`Row 187 validation PASS (${rows.length} checks) → ${outPath}`);
}

void main();
