/**
 * Row 197 / AOS al-197 — Blueprint-to-Journey alignment validation.
 * Run: npm run fab5:row197
 *
 * Does not mark Founder acceptance. Does not merge.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  FOUNDER_ONLY_EXERCISES,
  JOURNEY_ONLY_SECTIONS,
  BLUEPRINT_EXERCISE_SPECS,
  validateBlueprintJourneyAlignment,
} from "@/lib/blueprint/journey-alignment";

async function main() {
  const report = validateBlueprintJourneyAlignment();
  const failedChecks = report.checks.filter((check) => check.result === "FAIL");
  const ok = report.failed === 0;

  const payload = {
    aosWorkId: "al-197",
    row: 197,
    deliverable: "Validate Blueprint-to-Journey Alignment",
    ownerAgent: "nia",
    generatedAt: report.generatedAt,
    result: ok ? "PASS" : "FAIL",
    passed: report.passed,
    failed: report.failed,
    founderAcceptance: null,
    founderAcceptanceAuthority: "Kimberly Walker (human)",
    checks: report.checks,
    spec: {
      blueprintExercises: BLUEPRINT_EXERCISE_SPECS,
      journeyOnly: JOURNEY_ONLY_SECTIONS,
      founderOnly: FOUNDER_ONLY_EXERCISES,
    },
    notes: [
      "Chapter I–II Foundry reflection questions remain Journey-digital; Blueprint pages are Aliveness Project / Mirror steps.",
      "Chapter IV now emits Architect Reflection + The Standards Exercise, matching reserved exercisePageCount 2.",
      "Three Lives and Founder Closing Reflections are excluded from participant Blueprint writing pages.",
      "Founder acceptance stays with Kimberly Walker (human). This run does not mark the Command Center row complete.",
    ],
  };

  const runsDir = path.join(process.cwd(), "ops/fab-5/runs");
  const statusDir = path.join(runsDir, "aos-engineering-status");
  await mkdir(statusDir, { recursive: true });
  await writeFile(
    path.join(runsDir, "row-197-blueprint-journey-alignment.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(statusDir, "al-197.json"),
    `${JSON.stringify(
      {
        aosWorkId: "al-197",
        source: "command_center",
        sourceReference: "August Launch row 197",
        ownerAgent: "nia",
        title: "Validate Blueprint-to-Journey Alignment",
        generatedAt: report.generatedAt,
        technicalStatus: ok ? "complete" : "failed",
        founderAcceptance: null,
        nextAction: "await_founder_acceptance",
        result: ok ? "PASS" : "FAIL",
        passed: report.passed,
        failed: report.failed,
        evidence: [
          "ops/fab-5/runs/row-197-blueprint-journey-alignment.json",
          "lib/blueprint/journey-alignment.ts",
          "lib/blueprint/map-journey-to-blueprint.ts",
        ],
        failedChecks: failedChecks.map((check) => check.id),
        softwareChange: true,
        notes: payload.notes,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  for (const check of report.checks) {
    console.log(`${check.result} - ${check.id} - ${check.detail}`);
  }
  console.log(
    ok
      ? `ROW197_ALIGNMENT=PASS (${report.passed} checks)`
      : `ROW197_ALIGNMENT=FAIL (${report.failed} failed / ${report.passed} passed)`,
  );
  if (!ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
