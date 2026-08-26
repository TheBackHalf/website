/**
 * Narrow Row 73 validation. Does not mark Complete, rotate secrets,
 * send mail, charge, refund, payout, change DNS, or alter vendor plans.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import { buildRow73ReviewModel } from "@/lib/fab-5/row73-review";
import {
  collectRow73Evidence,
  row73TextContainsSecrets,
  ROW73_REVIEW_PATH,
} from "@/lib/fab-5/row73-capacity";

async function probeLocal(pathName: string): Promise<{ path: string; status: number }> {
  try {
    const response = await fetch(`http://localhost:3000${pathName}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(60000),
    });
    return { path: pathName, status: response.status };
  } catch {
    return { path: pathName, status: 0 };
  }
}

async function main() {
  const evidence = await collectRow73Evidence();
  const model = buildRow73ReviewModel(evidence);

  const local = {
    review: await probeLocal(ROW73_REVIEW_PATH),
    register: await probeLocal("/register"),
    login: await probeLocal("/login"),
    lumina: await probeLocal("/lumina"),
    support: await probeLocal("/support"),
    health: await probeLocal("/api/ops/health"),
    admin: await probeLocal("/ops/admin"),
    kpi: await probeLocal("/ops/admin/launch-kpi"),
    dashboard: await probeLocal("/ops/admin/launch-dashboard"),
    checkout: await probeLocal("/checkout"),
  };

  const evidenceText = JSON.stringify(evidence);
  const modelText = JSON.stringify({
    title: model.title,
    finalStatus: model.finalStatus,
    vendorResults: model.vendorResults,
    stripeLive: model.stripeLive,
    founderVerification: model.founderVerification,
  });
  const secretsExposed =
    row73TextContainsSecrets(evidenceText) || row73TextContainsSecrets(modelText);

  const result = {
    generatedAt: new Date().toISOString(),
    secretsPrinted: false,
    secretsExposed,
    markedComplete: false,
    scorecard: {
      overallVendorCapacity: model.overallVendorCapacity,
      overallBillingContinuity: model.overallBillingContinuity,
      knownLaunchStoppingVendorCondition: model.knownLaunchStoppingVendorCondition,
      launchFunctions: model.launchFunctions,
    },
    vendorResults: model.vendorResults,
    stripeLive: model.stripeLive,
    founderMedia: model.founderMediaDetail,
    capacity: model.capacity,
    founderVerificationCount: model.founderVerification.length,
    actualLaunchBlockers: model.actualLaunchBlockers,
    remainingRow73Blockers: model.remainingRow73Blockers,
    regression: model.regression,
    evidence: {
      productionHost: evidence.productionHost,
      productionHealth: evidence.productionHealth,
      productionPages: evidence.productionPages,
      postgresLocal: evidence.postgresLocal,
      vercel: {
        inspectOk: evidence.vercel.inspectOk,
        authenticated: evidence.vercel.authenticated,
        productionReady: evidence.vercel.productionReady,
        productionReadyState: evidence.vercel.productionReadyState,
        envNamePresence: evidence.vercel.envNamePresence,
        cliEnvNameCount: evidence.vercel.cliEnvNameCount,
        cronJobCount: evidence.vercel.cronJobCount,
        note: evidence.vercel.note,
      },
      stripe: {
        localKeyNamePresent: evidence.stripe.localKeyNamePresent,
        localKeyClass: evidence.stripe.localKeyClass,
        balanceOk: evidence.stripe.balanceOk,
        livemode: evidence.stripe.livemode,
        sandboxKey: evidence.stripe.sandboxKey,
        balanceNote: evidence.stripe.balanceNote,
        account: evidence.stripe.account,
        webhooks: evidence.stripe.webhooks,
        vercelKeyNamePresent: evidence.stripe.vercelKeyNamePresent,
        vercelKeyClass: evidence.stripe.vercelKeyClass,
        vercelWebhookSecretNamePresent: evidence.stripe.vercelWebhookSecretNamePresent,
        vercelPriceNamesPresent: evidence.stripe.vercelPriceNamesPresent,
        codeWebhookRoutePresent: evidence.stripe.codeWebhookRoutePresent,
        codeCheckoutPresent: evidence.stripe.codeCheckoutPresent,
      },
      openai: evidence.openai,
      aos: evidence.aos,
      email: evidence.email,
      dns: evidence.dns,
      github: evidence.github,
      founderMedia: evidence.founderMedia,
      statusPages: evidence.statusPages,
      localEnvNameCount: evidence.localEnvNamesPresent.length,
    },
    http: local,
    readyForFounderAcceptance: model.readyForFounderAcceptance,
    finalStatus: model.finalStatus,
  };

  const serialized = JSON.stringify(result, null, 2);
  if (row73TextContainsSecrets(serialized)) {
    throw new Error("row73_validation_matched_secret_pattern");
  }

  const out = path.join(process.cwd(), "ops/fab-5/runs/row-73-vendor-capacity-billing-validation.json");
  writeFileSync(out, `${serialized}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        pass: model.readyForFounderAcceptance && !secretsExposed,
        finalStatus: model.finalStatus,
        overallVendorCapacity: model.overallVendorCapacity,
        remainingRow73Blockers: model.remainingRow73Blockers,
        out,
      },
      null,
      2,
    ),
  );
  if (secretsExposed) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "row73_failed");
  process.exit(1);
});
