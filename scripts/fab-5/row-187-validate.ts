/**
 * Mechanical Row 187 validation: responsive / touch hardening.
 * Does not mark Command Center complete or record Founder acceptance.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  computeKeyboardInset,
  isKeyboardOpen,
} from "@/lib/ui/visual-viewport";

type Verdict = "PASS" | "FAIL";

async function main() {
  const failures: string[] = [];
  const tests: Array<{ id: string; name: string; result: Verdict; detail: string }> =
    [];

  function record(id: string, name: string, pass: boolean, detail: string) {
    tests.push({ id, name, result: pass ? "PASS" : "FAIL", detail });
    if (!pass) failures.push(`${id} ${name}: ${detail}`);
  }

  const files = {
    layout: "app/layout.tsx",
    globals: "app/globals.css",
    tokens: "styles/design-tokens.css",
    mobile: "styles/mobile-touch.css",
    inset: "components/mobile/visual-viewport-inset.tsx",
    geometry: "lib/ui/visual-viewport.ts",
    section: "components/home/section-shell.tsx",
  };

  for (const [id, file] of Object.entries(files)) {
    record(
      `F-${id}`,
      `${file} exists`,
      existsSync(file),
      existsSync(file) ? file : `missing ${file}`,
    );
  }

  const layout = await readFile(files.layout, "utf8");
  const globals = await readFile(files.globals, "utf8");
  const mobile = await readFile(files.mobile, "utf8");
  const inset = await readFile(files.inset, "utf8");
  const tokens = await readFile(files.tokens, "utf8");
  const section = await readFile(files.section, "utf8");

  record(
    "V1",
    "Root layout exports Next.js Viewport",
    layout.includes("export const viewport") &&
      layout.includes('width: "device-width"') &&
      layout.includes("initialScale: 1") &&
      layout.includes('viewportFit: "cover"') &&
      layout.includes('interactiveWidget: "resizes-content"'),
    "device-width, cover, resizes-content",
  );

  record(
    "V2",
    "Viewport does not disable pinch-zoom",
    !layout.includes("userScalable: false") &&
      !layout.includes("maximumScale: 1"),
    "userScalable remains enabled",
  );

  record(
    "V3",
    "VisualViewportInset is mounted in root layout",
    layout.includes("VisualViewportInset") &&
      inset.includes("computeKeyboardInset") &&
      inset.includes("scrollIntoView"),
    "keyboard inset + focused-field scroll",
  );

  record(
    "C1",
    "Mobile-touch stylesheet is imported",
    globals.includes('mobile-touch.css'),
    "globals.css imports styles/mobile-touch.css",
  );

  record(
    "C2",
    "Overflow clip and 16px form inputs",
    mobile.includes("overflow-x: clip") &&
      mobile.includes("font-size: 1rem") &&
      globals.includes("min-h-11 w-full rounded-sm border"),
    "html/body clip + 16px inputs prevent iOS zoom",
  );

  record(
    "C3",
    "Tap-target token and 44px controls",
    tokens.includes("--bh-tap-min: 2.75rem") &&
      mobile.includes("--bh-tap-min") &&
      globals.includes("size-11") &&
      globals.includes("bh-onboarding-rating") &&
      globals.includes("min-h-11 min-w-11") &&
      globals.includes("bh-language-switcher-link") &&
      globals.includes("min-h-11 min-w-11 items-center justify-center"),
    "44px language switcher, ratings, mobile toggle, account",
  );

  record(
    "C4",
    "Keyboard overlap padding uses visual-viewport inset",
    globals.includes("var(--bh-keyboard-inset") &&
      mobile.includes("--bh-keyboard-inset") &&
      mobile.includes("data-bh-keyboard"),
    "composer dock + chat column shrink when keyboard is open",
  );

  record(
    "C5",
    "Media does not overflow the viewport",
    mobile.includes("max-width: 100%") &&
      mobile.includes(".bh-founder-media-video") &&
      mobile.includes("object-fit: contain"),
    "img/video/iframe max-width + founder media contain",
  );

  record(
    "C6",
    "Public and dashboard headers wrap instead of clipping",
    globals.includes("bh-site-header-inner") &&
      globals.includes("flex-wrap") &&
      globals.includes("bh-app-dashboard-actions") &&
      globals.includes("flex-col items-stretch gap-3") &&
      section.includes("overflow-x-clip"),
    "site header wrap, dashboard CTAs stack, section clip-x",
  );

  record(
    "C7",
    "Reduced-data path drops decorative hero motion",
    mobile.includes("prefers-reduced-data") &&
      mobile.includes("bh-hero-noise") &&
      mobile.includes("animation: none"),
    "performance: skip glow/noise/kenburns when requested",
  );

  const keyboardClosed = computeKeyboardInset({
    innerHeight: 800,
    visualViewportHeight: 800,
    visualViewportOffsetTop: 0,
  });
  const keyboardOpen = computeKeyboardInset({
    innerHeight: 800,
    visualViewportHeight: 420,
    visualViewportOffsetTop: 0,
  });
  const scrolled = computeKeyboardInset({
    innerHeight: 800,
    visualViewportHeight: 420,
    visualViewportOffsetTop: 40,
  });

  record(
    "K1",
    "Keyboard inset geometry",
    keyboardClosed === 0 &&
      keyboardOpen === 380 &&
      scrolled === 340 &&
      !isKeyboardOpen(keyboardClosed) &&
      isKeyboardOpen(keyboardOpen),
    `closed=${keyboardClosed}; open=${keyboardOpen}; scrolled=${scrolled}`,
  );

  record(
    "S1",
    "No secrets in Row 187 sources",
    ![layout, globals, mobile, inset, tokens].some((source) =>
      /sk_live|sk_test|CURSOR_API_KEY\s*[:=]|POSTGRES_URL\s*[:=]|STRIPE_SECRET/i.test(
        source,
      ),
    ),
    "no API keys or connection strings",
  );

  const payload = {
    workId: "al-187",
    row: 187,
    deliverable: "Fix Responsive and Touch Issues",
    at: new Date().toISOString(),
    owner: "imani",
    founderAcceptanceRecorded: false,
    commandCenterMarkedComplete: false,
    stripeConfigModified: false,
    customDomainDnsModified: false,
    tests,
    failures,
    result: failures.length === 0 ? "PASS" : "FAIL",
  };

  await mkdir("ops/fab-5/runs", { recursive: true });
  await writeFile(
    "ops/fab-5/runs/row-187-responsive-touch-validation.json",
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );

  await mkdir("ops/fab-5/runs/aos-engineering-status", { recursive: true });
  await writeFile(
    "ops/fab-5/runs/aos-engineering-status/al-187.json",
    `${JSON.stringify(
      {
        workId: "al-187",
        source: "command_center August Launch row 187",
        owner: "imani",
        deliverable: "Fix Responsive and Touch Issues",
        repositoryChange: true,
        status: payload.result === "PASS" ? "VALIDATING" : "FAILED",
        founderAcceptance: null,
        commandCenterComplete: false,
        evidence: "ops/fab-5/runs/row-187-responsive-touch-validation.json",
        notes:
          "Software change: mobile overflow, tap targets, keyboard inset, media, and performance. Nia retests participant experience. Founder acceptance stays with Kimberly Walker (human).",
        at: payload.at,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        result: payload.result,
        failures,
        passed: tests.filter((test) => test.result === "PASS").length,
        total: tests.length,
      },
      null,
      2,
    ),
  );
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
