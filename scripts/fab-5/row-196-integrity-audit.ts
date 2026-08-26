import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { auditJourneyInstructionalIntegrity } from "@/lib/journey/instructional-integrity";

async function main() {
  const audit = auditJourneyInstructionalIntegrity({
    coreTeachingRenderedOnWelcome: true,
  });
  const dir = path.join(process.cwd(), "ops/fab-5/runs");
  await mkdir(dir, { recursive: true });
  const evidencePath = path.join(
    dir,
    "row-196-instructional-integrity-audit-2026-08-26.json",
  );
  await writeFile(evidencePath, JSON.stringify(audit, null, 2) + "\n", "utf8");
  console.log(
    JSON.stringify(
      {
        overall: audit.overall,
        defects: audit.defects.length,
        evidencePath,
      },
      null,
      2,
    ),
  );
  if (audit.overall === "FAIL") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
