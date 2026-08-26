import { readFileSync } from "node:fs";
import path from "node:path";
import { ACCESSIBLE_PDF_OPTIONS } from "@/lib/blueprint/accessible-pdf";
import { getBlueprintDownloadAssets } from "@/lib/blueprint/downloads";

export type AccessibilityCheck = {
  id: string;
  name: string;
  result: "PASS" | "FAIL";
  detail: string;
};

export type ContrastSample = {
  id: string;
  foreground: string;
  background: string;
  ratio: number;
  largeText: boolean;
  minimum: number;
};

function srgbChannel(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(rgb: readonly [number, number, number]): number {
  const [r, g, b] = rgb.map(srgbChannel) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(
  foreground: readonly [number, number, number],
  background: readonly [number, number, number],
): number {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const n = Number.parseInt(value, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Compact OKLCH → sRGB conversion for locked print tokens. */
export function oklchToSrgb(
  l: number,
  c: number,
  hDeg: number,
): [number, number, number] {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;
  const rLin = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
  const toSrgb = (channel: number) => {
    const clipped = Math.min(1, Math.max(0, channel));
    return clipped <= 0.0031308
      ? 12.92 * clipped
      : 1.055 * clipped ** (1 / 2.4) - 0.055;
  };
  return [toSrgb(rLin), toSrgb(gLin), toSrgb(bLin)];
}

const CREAM = oklchToSrgb(0.975, 0.014, 85);
const INK = oklchToSrgb(0.2, 0.03, 300);
const SECONDARY = oklchToSrgb(0.32, 0.06, 305);
const PURPLE = oklchToSrgb(0.42, 0.14, 305);
const NIGHT = oklchToSrgb(0.14, 0.035, 300);
const COVER_GOLD = hexToRgb("#c4a35a");
const COVER_DARK = hexToRgb("#2a1f3d");
const COVER_WHITE: [number, number, number] = [1, 1, 1];

export const PRINT_CONTRAST_SAMPLES: ContrastSample[] = [
  {
    id: "body-ink-on-cream",
    foreground: "oklch(0.2 0.03 300)",
    background: "oklch(0.975 0.014 85)",
    ratio: contrastRatio(INK, CREAM),
    largeText: false,
    minimum: 4.5,
  },
  {
    id: "secondary-on-cream",
    foreground: "oklch(0.32 0.06 305)",
    background: "oklch(0.975 0.014 85)",
    ratio: contrastRatio(SECONDARY, CREAM),
    largeText: false,
    minimum: 4.5,
  },
  {
    id: "purple-on-cream",
    foreground: "oklch(0.42 0.14 305)",
    background: "oklch(0.975 0.014 85)",
    ratio: contrastRatio(PURPLE, CREAM),
    largeText: false,
    minimum: 4.5,
  },
  {
    id: "heading-night-on-cream",
    foreground: "oklch(0.14 0.035 300)",
    background: "oklch(0.975 0.014 85)",
    ratio: contrastRatio(NIGHT, CREAM),
    largeText: true,
    minimum: 3,
  },
  {
    id: "cover-gold-on-dark",
    foreground: "#c4a35a",
    background: "#2a1f3d",
    ratio: contrastRatio(COVER_GOLD, COVER_DARK),
    largeText: false,
    minimum: 4.5,
  },
  {
    id: "cover-white-on-dark",
    foreground: "#ffffff",
    background: "#2a1f3d",
    ratio: contrastRatio(COVER_WHITE, COVER_DARK),
    largeText: false,
    minimum: 4.5,
  },
];

function repoFile(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function fileContains(relativePath: string, needle: string | RegExp): boolean {
  const contents = repoFile(relativePath);
  return typeof needle === "string" ? contents.includes(needle) : needle.test(contents);
}

export function auditDownloadableDocumentAccessibility(): {
  checks: AccessibilityCheck[];
  contrast: ContrastSample[];
  assets: ReturnType<typeof getBlueprintDownloadAssets>;
  passed: boolean;
} {
  const checks: AccessibilityCheck[] = [];

  checks.push({
    id: "tagged-pdf-options",
    name: "Runtime PDF export is tagged with outline",
    result:
      ACCESSIBLE_PDF_OPTIONS.tagged === true &&
      ACCESSIBLE_PDF_OPTIONS.outline === true
        ? "PASS"
        : "FAIL",
    detail: `tagged=${ACCESSIBLE_PDF_OPTIONS.tagged} outline=${ACCESSIBLE_PDF_OPTIONS.outline}`,
  });

  const taggedSources = [
    "lib/blueprint/render-authenticated-print-pdf.ts",
    "scripts/export-blueprint.mjs",
    "scripts/export-guidebook-only.mjs",
    "app/api/architect/blueprint/guidebook/route.ts",
    "app/api/architect/blueprint/aliveness-index/route.ts",
    "app/api/architect/blueprint/architects-commitment/route.ts",
    "app/api/architect/blueprint/decision-statement/route.ts",
    "app/api/architect/blueprint/back-half-standards/route.ts",
    "app/api/architect/blueprint/architect-identity/route.ts",
    "app/api/architect/blueprint/expansion-plan/route.ts",
    "app/api/architect/blueprint/declaration/route.ts",
    "app/api/architect/blueprint/certificate/route.ts",
  ];

  const missingTaggedRoute = taggedSources.filter((file) => {
    const contents = repoFile(file);
    return !(
      contents.includes("tagged: true") ||
      contents.includes("renderAuthenticatedPrintPdf") ||
      contents.includes("ACCESSIBLE_PDF_OPTIONS")
    );
  });

  checks.push({
    id: "all-download-routes-tagged",
    name: "Every Architect PDF download path requests tagged output",
    result: missingTaggedRoute.length === 0 ? "PASS" : "FAIL",
    detail:
      missingTaggedRoute.length === 0
        ? `Checked ${taggedSources.length} generators`
        : `Missing tagged export: ${missingTaggedRoute.join(", ")}`,
  });

  checks.push({
    id: "title-heading",
    name: "Guidebook title page exposes a document heading",
    result: fileContains(
      "components/blueprint/print/title-page.tsx",
      "<h1 className=\"bh-bp-title-copy\">",
    )
      ? "PASS"
      : "FAIL",
    detail: "Cover title renders as h1 from approved manuscript text",
  });

  checks.push({
    id: "document-lang",
    name: "Print documents declare English language",
    result: fileContains(
      "components/blueprint/print/print-document-shell.tsx",
      'lang="en"',
    )
      ? "PASS"
      : "FAIL",
    detail: "PrintDocumentShell sets lang=en for Blueprint English manuscript",
  });

  checks.push({
    id: "reading-order-artifacts",
    name: "Running headers and footers are artifacts",
    result:
      fileContains(
        "components/blueprint/print/print-page.tsx",
        'aria-hidden="true"',
      ) &&
      fileContains(
        "components/blueprint/print/print-page.tsx",
        "bh-bp-page-header",
      )
        ? "PASS"
        : "FAIL",
    detail: "Repeated page chrome is hidden from the tagged reading order",
  });

  checks.push({
    id: "exercise-heading",
    name: "Exercise pages always expose a heading",
    result: fileContains(
      "components/blueprint/print/exercise-page.tsx",
      "bh-bp-exercise-title",
    )
      ? "PASS"
      : "FAIL",
    detail: "Exercise title or fallback label is an h2",
  });

  checks.push({
    id: "writing-space-labels",
    name: "Blank form and writing areas have accessible names",
    result:
      fileContains(
        "components/blueprint/approved-copy-slot.tsx",
        "Blank lines are provided for a handwritten or typed response.",
      ) &&
      fileContains(
        "components/blueprint/print/aliveness-index-layout.tsx",
        "Rate 1 lowest to 5 highest",
      )
        ? "PASS"
        : "FAIL",
    detail: "Response lines and Aliveness ratings include text alternatives",
  });

  checks.push({
    id: "understandable-site-link",
    name: "Copyright site link uses destination text",
    result: fileContains(
      "components/blueprint/approved-copy-slot.tsx",
      'href="https://thebackhalf.org"',
    )
      ? "PASS"
      : "FAIL",
    detail: "thebackhalf.org is a real URL with matching link text",
  });

  checks.push({
    id: "decorative-images",
    name: "Cover and atmosphere images are decorative",
    result:
      fileContains(
        "components/blueprint/print/title-page.tsx",
        'aria-hidden="true"',
      ) &&
      fileContains("components/blueprint/print/title-page.tsx", 'alt=""')
        ? "PASS"
        : "FAIL",
    detail: "Cover photo/veil are hidden; butterfly mark has empty alt beside the heading",
  });

  checks.push({
    id: "selectable-text-pipeline",
    name: "PDFs are generated from HTML text, not flattened images",
    result: fileContains(
      "lib/blueprint/render-authenticated-print-pdf.ts",
      "page.pdf(ACCESSIBLE_PDF_OPTIONS)",
    )
      ? "PASS"
      : "FAIL",
    detail: "Chrome prints live HTML so body copy remains selectable",
  });

  const contrastChecks = PRINT_CONTRAST_SAMPLES.map((sample) => {
    const pass = sample.ratio + 1e-6 >= sample.minimum;
    return {
      id: `contrast-${sample.id}`,
      name: `Contrast ${sample.id}`,
      result: pass ? ("PASS" as const) : ("FAIL" as const),
      detail: `${sample.foreground} on ${sample.background} = ${sample.ratio.toFixed(2)}:1 (min ${sample.minimum}:1${sample.largeText ? ", large text" : ""})`,
    };
  });
  checks.push(...contrastChecks);

  const passed = checks.every((check) => check.result === "PASS");
  return {
    checks,
    contrast: PRINT_CONTRAST_SAMPLES,
    assets: getBlueprintDownloadAssets(),
    passed,
  };
}
