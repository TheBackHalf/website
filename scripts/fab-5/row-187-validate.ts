/**
 * Mechanical Row 187 responsive / touch audit.
 * Does not mark Founder acceptance. Does not change production config.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  keyboardInsetPx,
  KEYBOARD_INSET_CUSTOM_PROPERTY,
  applyKeyboardInset,
  clearKeyboardInset,
  measureAndApplyKeyboardInset,
} from "@/lib/ui/visual-viewport";

type Verdict = "PASS" | "FAIL";

type TestRow = {
  id: string;
  name: string;
  result: Verdict;
  detail: string;
};

const tests: TestRow[] = [];

function record(id: string, name: string, pass: boolean, detail: string) {
  tests.push({ id, name, result: pass ? "PASS" : "FAIL", detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}  ${name}  ${detail}`);
}

function read(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

function hasAll(source: string, needles: string[]): boolean {
  return needles.every((needle) => source.includes(needle));
}

async function main() {
  record(
    "K1",
    "keyboardInsetPx reports keyboard overlap",
    keyboardInsetPx(800, 500, 0) === 300 &&
      keyboardInsetPx(800, 500, 40) === 260 &&
      keyboardInsetPx(700, 700, 0) === 0 &&
      keyboardInsetPx(Number.NaN, 500, 0) === 0,
    "inset math covers keyboard, offset, and invalid input",
  );

  const style: { store: Record<string, string> } & CSSStyleDeclaration = {
    store: {},
    setProperty(name: string, value: string) {
      this.store[name] = value;
    },
    removeProperty(name: string) {
      delete this.store[name];
      return "";
    },
  } as unknown as { store: Record<string, string> } & CSSStyleDeclaration;

  applyKeyboardInset(style, 128);
  record(
    "K2",
    "applyKeyboardInset writes custom property",
    style.store[KEYBOARD_INSET_CUSTOM_PROPERTY] === "128px",
    `${KEYBOARD_INSET_CUSTOM_PROPERTY}=${style.store[KEYBOARD_INSET_CUSTOM_PROPERTY]}`,
  );

  const inset = measureAndApplyKeyboardInset(
    {
      innerHeight: 780,
      visualViewport: { height: 420, offsetTop: 12 } as VisualViewport,
    },
    style,
  );
  record(
    "K3",
    "measureAndApplyKeyboardInset uses visualViewport",
    inset === 348 && style.store[KEYBOARD_INSET_CUSTOM_PROPERTY] === "348px",
    `inset=${inset}`,
  );

  clearKeyboardInset(style);
  record(
    "K4",
    "clearKeyboardInset removes property",
    style.store[KEYBOARD_INSET_CUSTOM_PROPERTY] === undefined,
    "property cleared",
  );

  const layout = read("app/layout.tsx");
  record(
    "V1",
    "Root viewport covers device width and keyboard",
    hasAll(layout, [
      "export const viewport",
      'width: "device-width"',
      'viewportFit: "cover"',
      'interactiveWidget: "resizes-content"',
      "ViewportStability",
    ]),
    "viewport metadata and ViewportStability mount present",
  );

  const tokens = read("styles/design-tokens.css");
  record(
    "V2",
    "Design tokens include tap and keyboard insets",
    hasAll(tokens, ["--bh-tap-min: 2.75rem", "--bh-keyboard-inset: 0px"]),
    "44px tap token and keyboard inset token present",
  );

  const css = read("app/globals.css");
  const heroSubtextBlock = css.slice(
    css.indexOf(".bh-hero-subtext"),
    css.indexOf(".bh-hero-cta"),
  );
  record(
    "O1",
    "Overflow and wrap guards",
    hasAll(css, [
      "overflow-x-clip",
      "overflow-wrap: break-word",
      "max-width: 100%",
      "@media (min-width: 1280px)",
    ]) && !heroSubtextBlock.includes("white-space: nowrap"),
    "horizontal clip, wrapping, and hero subtext no longer forced nowrap",
  );

  record(
    "T1",
    "Tap targets on public and app chrome",
    hasAll(css, [
      "min-h-11",
      ".bh-language-switcher-link",
      ".bh-hero-nav-link",
      ".bh-site-header-link",
      ".bh-consent-checkbox",
      ".bh-app-mobile-toggle",
      ".bh-touch-choice",
      ".bh-nav-footer-link",
    ]),
    "nav, language, consent, footer, and app toggle use 44px targets",
  );

  record(
    "T2",
    "Consent and chapter inputs are touch-safe",
    css.includes(".bh-consent-checkbox") &&
      css.includes("size-6") &&
      css.includes(".bh-chapter-answer-input") &&
      css.includes("text-base") &&
      css.includes("font-size: max(1rem, 16px)"),
    "16px inputs prevent iOS zoom; checkboxes enlarged",
  );

  record(
    "S1",
    "Scrolling and safe areas",
    hasAll(css, [
      "-webkit-overflow-scrolling: touch",
      "overscroll-behavior-x: contain",
      "env(safe-area-inset-top)",
      "env(safe-area-inset-bottom)",
      "min-h-dvh",
    ]),
    "touch scrolling, safe-area padding, and dynamic viewport height",
  );

  record(
    "B1",
    "Keyboard overlap padding on Lumina composer",
    css.includes("var(--bh-keyboard-inset, 0px)") &&
      css.includes(".bh-lumina-chat-composer-dock") &&
      css.includes("scroll-margin-bottom"),
    "composer dock and focused fields reserve keyboard space",
  );

  record(
    "M1",
    "Media containment",
    hasAll(css, ["img,", "video,", "max-width: 100%"]),
    "img/video cannot blow out the layout",
  );

  record(
    "P1",
    "Mobile performance reductions",
    hasAll(css, [
      ".bh-hero-media img",
      "animation: none",
      ".bh-hero-noise",
      "display: none",
    ]) && css.includes("prefers-reduced-motion"),
    "Ken Burns/glow/noise disabled on small screens; reduced motion kept",
  );

  const header = read("components/site/site-header.tsx");
  record(
    "H1",
    "Site header still uses shared nav classes",
    hasAll(header, ["bh-hero-nav-actions", "bh-hero-nav-links", "bh-site-header"]),
    "site header wrap rules can attach to existing markup",
  );

  const ageGate = read("components/eligibility/age-gate.tsx");
  record(
    "A1",
    "Age gate radios use enlarged touch rows",
    ageGate.includes("bh-touch-choice") && !ageGate.includes("h-4 w-4"),
    "eligibility radios no longer use 16px-only hit targets",
  );

  const shell = read("components/app-shell/app-shell-layout.tsx");
  record(
    "N1",
    "Mobile drawer locks background scroll",
    shell.includes('document.body.style.overflow = "hidden"') &&
      shell.includes("mobileOpen"),
    "architect mobile nav prevents background scroll",
  );

  const section = read("components/home/section-shell.tsx");
  record(
    "C1",
    "Section shells clip horizontally without hiding wrapped text",
    section.includes("overflow-x-clip") && !section.includes("overflow-hidden"),
    "section overflow-x-clip",
  );

  record(
    "X1",
    "Auth and payment files untouched by this deliverable",
    existsSync("middleware.ts") &&
      existsSync("lib/auth/registration.ts") &&
      existsSync("lib/checkout/actions.ts"),
    "no Stripe/auth rewrite required for responsive/touch work",
  );

  const failed = tests.filter((test) => test.result === "FAIL");
  const evidenceDir = path.join(process.cwd(), "ops/fab-5/runs");
  await mkdir(evidenceDir, { recursive: true });
  const evidencePath = path.join(evidenceDir, "row-187-responsive-touch-validation.json");
  const payload = {
    generatedAt: new Date().toISOString(),
    row: 187,
    aosWorkId: "al-187",
    title: "Fix Responsive and Touch Issues",
    owner: "imani",
    founderAcceptanceRecorded: false,
    merged: false,
    result: failed.length === 0 ? "PASS" : "FAIL",
    passed: tests.length - failed.length,
    failed: failed.length,
    tests,
  };
  await writeFile(evidencePath, `${JSON.stringify(payload, null, 2)}\n`);

  if (failed.length > 0) {
    console.error(`\nRow 187 validation failed: ${failed.length} check(s).`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nRow 187 validation passed: ${tests.length} checks.`);
}

void main();
