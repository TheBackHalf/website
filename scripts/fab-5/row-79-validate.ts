/**
 * Narrow Row 79 validation. Does not rebuild campaign assets.
 * Does not modify Launch Roadmap, Founder Notes, or Row 75.
 * Reads Founder acceptance from ops/fab-5/row-79-status.json; does not overwrite it.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import { collectRow79Checks, ROW79_REVIEW_PATH, ROW79_VALIDATION_PATH } from "@/lib/fab-5/row79-campaign";
import { buildRow79ReviewModel } from "@/lib/fab-5/row79-review";

async function probeLocal(pathName: string): Promise<{ path: string; status: number }> {
  try {
    const response = await fetch(`http://localhost:3000${pathName}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    return { path: pathName, status: response.status };
  } catch {
    return { path: pathName, status: 0 };
  }
}

async function probeCanonical(url: string): Promise<{ url: string; status: number; ok: boolean }> {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    return { url, status: response.status, ok: response.status >= 200 && response.status < 400 };
  } catch {
    return { url, status: 0, ok: false };
  }
}

async function main() {
  const checks = collectRow79Checks();
  const http = {
    review: await probeLocal(ROW79_REVIEW_PATH),
    register: await probeLocal("/register"),
    journey: await probeLocal("/journey"),
    lumina: await probeLocal("/lumina"),
    home: await probeLocal("/"),
    canonicalRegister: await probeCanonical("https://thebackhalf.org/register"),
  };
  const model = buildRow79ReviewModel(checks, {
    register: http.register,
    journey: http.journey,
    lumina: http.lumina,
    canonicalRegister: http.canonicalRegister,
  });

  const result = {
    generatedAt: new Date().toISOString(),
    campaignRebuilt: false,
    markedComplete: model.rowMarkedComplete,
    founderAcceptanceRecorded: model.founderAcceptanceRecorded,
    launchRoadmapUnchanged: true,
    founderNotesUnchanged: true,
    row75Unchanged: true,
    checks,
    scorecard: {
      existingCampaign: model.existingCampaign,
      platforms: model.platforms,
      requirements: model.requirements,
      cta: model.cta,
      platformSpecific: model.platformSpecific,
      assets: model.assets,
      reconciliation: model.reconciliation,
      regression: model.regression,
      closure: model.closure,
    },
    http,
    readyForFounderAcceptance: model.readyForFounderAcceptance,
    exactCommitmentSatisfied: model.exactCommitmentSatisfied,
    finalStatus: model.finalStatus,
  };

  const out = path.join(process.cwd(), ROW79_VALIDATION_PATH);
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  const pass =
    model.exactCommitmentSatisfied === "YES" &&
    (model.rowMarkedComplete || model.readyForFounderAcceptance);
  console.log(
    JSON.stringify(
      {
        pass,
        finalStatus: model.finalStatus,
        founderAcceptanceRecorded: model.founderAcceptanceRecorded,
        remainingBlockers: model.remainingBlockers,
        out,
      },
      null,
      2,
    ),
  );
  if (!pass) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "row79_failed");
  process.exit(1);
});
