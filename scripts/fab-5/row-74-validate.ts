/**
 * Narrow Row 74 validation. Does not store secrets, rotate keys,
 * send mail, change DNS, enable Cloudflare 2FA, or start Row 75.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import { buildRow74ReviewModel } from "@/lib/fab-5/row74-review";
import {
  collectRow74LiveChecks,
  loadRow74Register,
  row74TextContainsSecrets,
  ROW74_PRODUCTION_HOST,
  ROW74_REGISTER_PATH,
  ROW74_REVIEW_PATH,
} from "@/lib/fab-5/row74-register";

async function probe(
  base: string,
  pathName: string,
  timeoutMs = 8000,
): Promise<{ path: string; status: number }> {
  try {
    const response = await fetch(`${base}${pathName}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { path: pathName, status: response.status };
  } catch {
    return { path: pathName, status: 0 };
  }
}

function anonymousOk(status: number): boolean {
  return status === 200;
}

async function main() {
  const register = loadRow74Register();
  const live = collectRow74LiveChecks();
  const model = buildRow74ReviewModel(register, live);

  const http = {
    review: await probe("http://localhost:3000", ROW74_REVIEW_PATH, 3000),
    registerPage: await probe("http://localhost:3000", "/register", 3000),
    login: await probe("http://localhost:3000", "/login", 3000),
    lumina: await probe("http://localhost:3000", "/lumina", 3000),
    support: await probe("http://localhost:3000", "/support", 3000),
    health: await probe("http://localhost:3000", "/api/ops/health", 3000),
    admin: await probe("http://localhost:3000", "/ops/admin", 3000),
  };

  const productionPaths = ["/register", "/login", "/lumina", "/support", "/api/ops/health"] as const;
  const productionHttp: Record<string, { path: string; status: number }> = {};
  for (const pathName of productionPaths) {
    productionHttp[pathName] = await probe(ROW74_PRODUCTION_HOST, pathName);
  }

  const productionRegressionPass = productionPaths.every((pathName) =>
    anonymousOk(productionHttp[pathName].status),
  );

  const secretsExposed =
    row74TextContainsSecrets(JSON.stringify(register)) ||
    row74TextContainsSecrets(JSON.stringify(model.scorecard)) ||
    live.secretsInRegister;

  const mechanicalPass =
    !secretsExposed &&
    productionRegressionPass &&
    (register.founderAcceptance === "APPROVED" ? model.closedOut : model.readyForFounderAcceptance);

  const result = {
    generatedAt: new Date().toISOString(),
    secretsPrinted: false,
    secretsExposed,
    markedComplete: model.markedComplete,
    closedOut: model.closedOut,
    founderAcceptance: model.founderAcceptance,
    registerPath: ROW74_REGISTER_PATH,
    productionHost: ROW74_PRODUCTION_HOST,
    scorecard: model.scorecard,
    accountResults: model.accountResults,
    workspaceHighPriority: model.workspaceHighPriority,
    lockout: model.lockout,
    stripeCloudflareAudit: register.stripeCloudflareAudit ?? null,
    remainingRow74Blockers: model.remainingRow74Blockers,
    actualLaunchBlockers: model.actualLaunchBlockers,
    regression: model.regression,
    productionRegression: productionRegressionPass ? "PASS" : "FAIL",
    live: {
      githubOriginIndependent: live.githubOriginIndependent,
      cursorNotSoleSource: live.cursorNotSoleSource,
      elevenLabsEnvAbsent: live.elevenLabsEnvAbsent,
      heygenEnvAbsent: live.heygenEnvAbsent,
      smtpNamesPresent: live.smtpNamesPresent,
      officialInstagram: live.officialInstagram,
      officialTikTok: live.officialTikTok,
      aiExecutivesNotHumanHolders: live.aiExecutivesNotHumanHolders,
      namedSocialRecoveryIsKimberly: live.namedSocialRecoveryIsKimberly,
    },
    http,
    productionHttp,
    readyForFounderAcceptance: model.readyForFounderAcceptance,
    finalStatus: model.finalStatus,
    mechanicalFailure: mechanicalPass
      ? "NONE"
      : [
          secretsExposed ? "secrets_exposed" : null,
          productionRegressionPass ? null : "production_regression_failed",
          register.founderAcceptance === "APPROVED" && !model.closedOut
            ? "closeout_integrity_failed"
            : null,
          register.founderAcceptance !== "APPROVED" && !model.readyForFounderAcceptance
            ? "not_ready_for_founder_acceptance"
            : null,
        ].filter(Boolean),
  };

  const serialized = JSON.stringify(result, null, 2);
  if (row74TextContainsSecrets(serialized)) {
    throw new Error("row74_validation_matched_secret_pattern");
  }

  const out = path.join(process.cwd(), "ops/fab-5/runs/row-74-credential-recovery-validation.json");
  writeFileSync(out, `${serialized}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        pass: mechanicalPass,
        closedOut: model.closedOut,
        finalStatus: model.finalStatus,
        stripeMfa: model.scorecard.stripeMfa,
        cloudflareMfa: model.scorecard.cloudflareMfa,
        productionRegression: productionRegressionPass ? "PASS" : "FAIL",
        remainingRow74Blockers: model.remainingRow74Blockers,
        mechanicalFailure: result.mechanicalFailure,
        out,
      },
      null,
      2,
    ),
  );
  if (!mechanicalPass) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "row74_failed");
  process.exit(1);
});
