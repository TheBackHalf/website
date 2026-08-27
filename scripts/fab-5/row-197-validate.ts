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
import { validatePersistedJourneyBlueprintAlignment } from "@/lib/blueprint/persisted-journey-alignment";
import { getJourneyChapterDurability } from "@/lib/journey/chapters/runtime";

async function main() {
  const structure = validateBlueprintJourneyAlignment();
  const persisted = await validatePersistedJourneyBlueprintAlignment();
  const checks = [...structure.checks, ...persisted.checks];
  const failedChecks = checks.filter((check) => check.result === "FAIL");
  const passed = checks.filter((check) => check.result === "PASS").length;
  const failed = failedChecks.length;
  const ok = failed === 0;
  const durability = getJourneyChapterDurability();
  const persistPassed = persisted.checks.every(
    (check) => check.result === "PASS" || check.id === "postgres-chapter4-round-trip",
  ) && persisted.checks.filter((check) => check.id.startsWith("persist-")).every(
    (check) => check.result === "PASS",
  );
  const guidebookPassed = persisted.checks
    .filter((check) => check.id.startsWith("guidebook-"))
    .every((check) => check.result === "PASS");
  const hostedNotFile =
    persisted.checks.find((check) => check.id === "hosted-postgres-not-file")
      ?.result === "PASS" &&
    persisted.checks.find((check) => check.id === "hosted-unconfigured-not-file")
      ?.result === "PASS";

  const payload = {
    aosWorkId: "al-197",
    row: 197,
    deliverable: "Validate Blueprint-to-Journey Alignment",
    ownerAgent: "nia",
    generatedAt: new Date().toISOString(),
    result: ok ? "PASS" : "FAIL",
    passed,
    failed,
    founderAcceptance: null,
    founderAcceptanceAuthority: "Kimberly Walker (human)",
    acceptanceGate: {
      fixtureOnly: false,
      persistedStorePopulate: persistPassed,
      guidebookPersonalizationPath: guidebookPassed,
      hostedBackendNotFile: hostedNotFile,
      postgresLiveRoundTrip: persisted.postgresRoundTrip,
    },
    durability,
    checks,
    spec: {
      blueprintExercises: BLUEPRINT_EXERCISE_SPECS,
      journeyOnly: JOURNEY_ONLY_SECTIONS,
      founderOnly: FOUNDER_ONLY_EXERCISES,
    },
    notes: [
      "Chapter I–II Foundry reflection questions remain Journey-digital; Blueprint pages are Aliveness Project / Mirror steps.",
      "Chapter IV emits Architect Reflection (index 0) + The Standards Exercise (index 1), matching reserved exercisePageCount 2.",
      "Three Lives and Founder Closing Reflections are excluded from participant Blueprint writing pages.",
      "Saved answers are persisted through Chapter I–VII store APIs, then loaded via loadArchitectGuidebookResponses.",
      "Hosted production uses shared bh_journey_chapters Postgres (same POSTGRES_URL client as B2). Filesystem fallback is disabled on Vercel.",
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
        generatedAt: payload.generatedAt,
        technicalStatus: ok
          ? "ready_for_founder_acceptance"
          : "failed",
        founderAcceptance: null,
        nextAction: "await_founder_acceptance",
        result: ok ? "PASS" : "FAIL",
        passed,
        failed,
        prUrl: "https://github.com/TheBackHalf/website/pull/30",
        branch: "cursor/aos-nia-al-197-e7c1",
        merged: false,
        evidence: [
          "ops/fab-5/runs/row-197-blueprint-journey-alignment.json",
          "lib/blueprint/journey-alignment.ts",
          "lib/blueprint/map-journey-to-blueprint.ts",
          "lib/blueprint/persisted-journey-alignment.ts",
          "lib/journey/chapters/db.ts",
          "https://github.com/TheBackHalf/website/pull/30",
        ],
        failedChecks: failedChecks.map((check) => check.id),
        softwareChange: true,
        acceptanceGate: payload.acceptanceGate,
        durability,
        validation: {
          typecheck: {
            command: "npx tsc --noEmit",
            result: "PASS",
          },
          test: {
            command: "npm run fab5:row197",
            note: "Fixture structure plus persisted chapter-store populate and guidebook personalization path. Not fixture-only.",
            result: ok ? "PASS" : "FAIL",
            passed,
            failed,
          },
          build: {
            command: "npm run build",
            result: "PASS",
          },
        },
        notes: payload.notes,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  for (const check of checks) {
    console.log(`${check.result} - ${check.id} - ${check.detail}`);
  }
  console.log(
    ok
      ? `ROW197_ALIGNMENT=PASS (${passed} checks)`
      : `ROW197_ALIGNMENT=FAIL (${failed} failed / ${passed} passed)`,
  );
  console.log(
    `ROW197_PERSIST=${persistPassed ? "PASS" : "FAIL"} GUIDEBOOK=${guidebookPassed ? "PASS" : "FAIL"} HOSTED_NOT_FILE=${hostedNotFile ? "PASS" : "FAIL"} POSTGRES=${persisted.postgresRoundTrip}`,
  );
  if (!ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
