/**
 * Narrow Row 82 validation. Does not live-publish or mark Complete.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildRow82Manifest,
  collectRow82Checks,
  collectRow82Entries,
  row82TextContainsSecrets,
  ROW82_ARTIFACT_PATH,
  ROW82_FINAL_STATUS,
  ROW82_MANIFEST_PATH,
  ROW82_REVIEW_PATH,
  ROW82_VALIDATION_PATH,
} from "@/lib/fab-5/row82-publishing";
import { buildRow82ReviewModel } from "@/lib/fab-5/row82-review";

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
  const entries = collectRow82Entries();
  const checks = collectRow82Checks(entries);
  const firstAsset = entries[0]?.assets[0]?.filename;
  const http = {
    review: await probeLocal(ROW82_REVIEW_PATH),
    media: firstAsset
      ? await probeLocal(`${ROW82_REVIEW_PATH}/media/${firstAsset}`)
      : { path: `${ROW82_REVIEW_PATH}/media`, status: 0 },
    register: await probeLocal("/register"),
    journey: await probeLocal("/journey"),
    lumina: await probeLocal("/lumina"),
    health: await probeLocal("/api/ops/health"),
    canonicalRegister: await probeCanonical("https://thebackhalf.org/register"),
  };
  const model = buildRow82ReviewModel(entries, {
    review: http.review,
    register: http.register,
    canonicalRegister: http.canonicalRegister,
  });
  const manifest = buildRow82Manifest(entries);

  const implementationPass =
    checks.artifactExists &&
    !checks.markedComplete &&
    !checks.founderAccepted &&
    checks.livePublishDisabled &&
    checks.captionsMatchCopy &&
    checks.timesMatchCopy &&
    checks.datesMatch &&
    checks.easternTimeExplicit &&
    checks.noLocalhost &&
    checks.noVercel &&
    checks.enrollmentUrlsOk &&
    checks.everyPreviewed &&
    checks.mediaOk &&
    checks.queueAligned &&
    checks.missingAssets.length === 0 &&
    !checks.secretsInArtifact &&
    http.review.status === 200 &&
    http.media.status === 200;

  const result = {
    generatedAt: new Date().toISOString(),
    secretsPrinted: false,
    markedComplete: false,
    founderAcceptanceRecorded: false,
    livePublishAttempted: false,
    instagramLoginAttempted: false,
    tiktokLoginAttempted: false,
    launchRoadmapUnchanged: true,
    founderNotesUnchanged: true,
    row77CompletionUnchanged: true,
    artifact: ROW82_ARTIFACT_PATH,
    manifest: ROW82_MANIFEST_PATH,
    finalStatus: ROW82_FINAL_STATUS,
    mechanicalImplementation: implementationPass ? "PASS" : "FAIL",
    checks,
    optionB: model.optionB,
    validation: model.validation,
    remainingBlockers: model.remainingBlockers,
    http,
  };

  const serialized = JSON.stringify(result, null, 2);
  if (row82TextContainsSecrets(serialized)) {
    throw new Error("row82_validation_matched_secret_pattern");
  }
  if (!implementationPass) {
    throw new Error("row82_mechanical_implementation_failed");
  }

  writeFileSync(path.join(process.cwd(), ROW82_MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  writeFileSync(path.join(process.cwd(), ROW82_VALIDATION_PATH), `${serialized}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        pass: implementationPass,
        finalStatus: ROW82_FINAL_STATUS,
        remainingBlockers: model.remainingBlockers,
        review: http.review,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "row82_failed");
  process.exit(1);
});
