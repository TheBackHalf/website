#!/usr/bin/env node
/**
 * AOS al-136 — audit launch-critical Blueprint PDF/download accessibility.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { auditDownloadableDocumentAccessibility } from "@/lib/blueprint/download-accessibility-audit";

const report = auditDownloadableDocumentAccessibility();

const payload = {
  generatedAt: new Date().toISOString(),
  aosWorkId: "al-136",
  source: "command_center",
  sourceReference: "August Launch row 136",
  deliverable: "Validate Downloadable Document Accessibility",
  ownerAgent: "imani",
  status: report.passed ? "ACCEPTANCE_READY" : "FAILED",
  founderAcceptance: {
    required: true,
    markedComplete: false,
    authority: "Kimberly Walker (human)",
    note: "Do not fabricate Founder approval. Workbook/command-center acceptance stays with the Founder.",
  },
  validation: {
    gatesRequired: [
      "npx tsc --noEmit",
      "npm run test:download-a11y",
      "npm run build",
    ],
    auditPassed: report.passed,
  },
  passed: report.passed,
  assets: report.assets.map((asset) => ({
    id: asset.id,
    filename: asset.filename,
    href: asset.href,
    label: asset.label,
  })),
  alternateAccessibleFormat: {
    approvedByFounder: false,
    engineeringRecommendation:
      "The authenticated HTML print views under /blueprint/print/* are the accessible equivalent source (native headings, selectable text, language, and reading order). Tagged PDFs generated from those views are the Architect-facing download. A separate public HTML/EPUB download is not Founder-approved.",
  },
  checks: report.checks,
  contrast: report.contrast.map((sample) => ({
    id: sample.id,
    ratio: Number(sample.ratio.toFixed(2)),
    minimum: sample.minimum,
    largeText: sample.largeText,
    pass: sample.ratio + 1e-6 >= sample.minimum,
  })),
};

async function main() {
  const outDir = path.join(
    process.cwd(),
    "ops/fab-5/runs/aos-engineering-status",
  );
  await mkdir(outDir, { recursive: true });
  await writeFile(
    path.join(outDir, "al-136.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );

  for (const check of report.checks) {
    console.log(`${check.result.padEnd(4)} ${check.id} — ${check.detail}`);
  }

  if (!report.passed) {
    console.error("\nDownloadable document accessibility audit failed.");
    process.exit(1);
  }

  console.log("\nDownloadable document accessibility audit passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
