/**
 * Narrow Row 77 validation. Repository evidence only.
 * Does not log into Instagram/TikTok, store secrets, live-publish, or mark Complete.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import {
  collectRow77RepoChecks,
  mechanicalDocumentationPass,
  row77TextContainsSecrets,
  ROW77_ARTIFACT_PATH,
  ROW77_FINAL_STATUS,
  ROW77_REVIEW_PATH,
  ROW77_VALIDATION_PATH,
} from "@/lib/fab-5/row77-governance";
import { buildRow77ReviewModel } from "@/lib/fab-5/row77-review";
import { runNiaSocialPublishTick } from "@/lib/fab-5/social-publishing";

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

async function main() {
  const checks = collectRow77RepoChecks();
  const model = buildRow77ReviewModel(checks);
  const docsPass = mechanicalDocumentationPass(checks);
  const niaTick = runNiaSocialPublishTick();

  const http = {
    review: await probeLocal(ROW77_REVIEW_PATH),
    registerPage: await probeLocal("/register"),
    login: await probeLocal("/login"),
    lumina: await probeLocal("/lumina"),
    support: await probeLocal("/support"),
    health: await probeLocal("/api/ops/health"),
    admin: await probeLocal("/ops/admin"),
  };

  const result = {
    generatedAt: new Date().toISOString(),
    secretsPrinted: false,
    markedComplete: false,
    instagramLoginAttempted: false,
    tiktokLoginAttempted: false,
    livePublishAttempted: false,
    launchRoadmapUnchanged: true,
    founderNotesUnchanged: true,
    artifact: ROW77_ARTIFACT_PATH,
    finalStatus: ROW77_FINAL_STATUS,
    readyForFounderAcceptance: false,
    mechanicalDocumentation: docsPass ? "PASS" : "FAIL",
    optionB: {
      founderDecision: model.founderDecision,
      socialOperatingOwner: model.socialOperatingOwner,
      instagramMfa: model.instagramMfa,
      tiktokMfa: model.tiktokMfa,
      workspaceIndependentRecovery: model.workspaceIndependentRecovery,
      instagramPublishingContinuity: model.instagramPublishingContinuity,
      tiktokPublishingContinuity: model.tiktokPublishingContinuity,
      founderRequiredAtPostingTime: model.founderRequiredAtPostingTime,
      scenarioH: model.scenarioH,
      publishingMechanism: model.publishingMechanism,
      niaTick,
    },
    scorecard: {
      accountOwnership: model.accountOwnership,
      administratorBackupAccess: model.administratorBackupAccess,
      credentialRecovery: model.credentialRecovery,
      mfa: model.mfa,
      postingAuthority: model.postingAuthority,
      commentsDms: model.commentsDms,
      brandStandards: model.brandStandards,
      approvalThresholds: model.approvalThresholds,
      emergencyAccess: model.emergencyAccess,
      solePointOfFailureTest: model.solePointOfFailureTest,
      founderVerificationRequired: model.founderVerificationRequired,
      actualBlockers: model.actualBlockers,
      conflictsFoundAndCorrected: model.conflictsFoundAndCorrected,
      regression: model.regression,
      remainingRow77Blockers: model.remainingRow77Blockers,
    },
    checks,
    http,
  };

  const serialized = JSON.stringify(result, null, 2);
  if (row77TextContainsSecrets(serialized)) {
    throw new Error("row77_validation_matched_secret_pattern");
  }
  if (!docsPass) {
    throw new Error("row77_mechanical_documentation_failed");
  }
  if (checks.secretsInArtifact) {
    throw new Error("row77_artifact_matched_secret_pattern");
  }
  if (model.publishingMechanism.livePublishEnabled === "YES") {
    throw new Error("row77_live_publish_must_remain_disabled");
  }

  const out = path.join(process.cwd(), ROW77_VALIDATION_PATH);
  writeFileSync(out, `${serialized}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        pass: docsPass,
        finalStatus: ROW77_FINAL_STATUS,
        scenarioH: model.scenarioH,
        remainingRow77Blockers: model.remainingRow77Blockers,
        out,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "row77_failed");
  process.exit(1);
});
