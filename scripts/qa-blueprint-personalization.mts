/**
 * Local QA — Architect Blueprint response assembly + isolation.
 * Run: npx tsx scripts/qa-blueprint-personalization.mts
 */
import { loadArchitectGuidebookResponses } from "../lib/blueprint/load-architect-guidebook-responses";

async function main() {
  const alpha = await loadArchitectGuidebookResponses("qa-architect-alpha");
  const beta = await loadArchitectGuidebookResponses("qa-architect-beta");

  const checks: Array<[string, boolean]> = [
    [
      "alpha ch1 q1 present",
      (alpha.byExerciseKey["chapter-1-awakening:0"] ?? [])
        .join(" ")
        .includes("creating with purpose"),
    ],
    [
      "beta isolation marker",
      (beta.byExerciseKey["chapter-1-awakening:0"] ?? [])
        .join(" ")
        .includes("BETA ONLY"),
    ],
    [
      "alpha does not contain beta",
      !JSON.stringify(alpha).includes("BETA ONLY"),
    ],
    [
      "beta does not contain alpha",
      !JSON.stringify(beta).includes("creating with purpose"),
    ],
    [
      "alpha ch2 step1 populated",
      (alpha.byExerciseKey["chapter-2-mirror:0"] ?? []).length >= 2,
    ],
    [
      "alpha ch3 practice populated",
      (alpha.byExerciseKey["chapter-3-decision:1"] ?? []).some((line) =>
        line.includes("protect my peace"),
      ),
    ],
  ];

  let failed = 0;
  for (const [label, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"} - ${label}`);
    if (!ok) failed += 1;
  }
  console.log(
    "ALPHA_KEYS",
    Object.keys(alpha.byExerciseKey).sort().join(", ") || "(none)",
  );
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
