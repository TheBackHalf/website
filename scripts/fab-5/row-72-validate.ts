/**
 * Narrow Row 72 validation. Does not mark Complete, rotate secrets,
 * send mail, charge, refund, change DNS, or alter vendor plans.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import { buildRow72ReviewModel } from "@/lib/fab-5/row72-review";
import {
  collectRow72LiveChecks,
  loadRow72Register,
  registerContainsSecrets,
  ROW72_REGISTER_PATH,
} from "@/lib/fab-5/row72-register";

const STATUS_URLS = [
  "https://www.vercel-status.com",
  "https://status.supabase.com",
  "https://status.stripe.com",
  "https://www.google.com/appsstatus/dashboard/",
  "https://status.openai.com",
  "https://status.heygen.com",
  "https://status.cursor.com",
  "https://www.githubstatus.com",
  "https://metastatus.com",
  "https://status.tiktok.com",
];

async function headOk(url: string): Promise<{ url: string; ok: boolean; status: number }> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "user-agent": "BackHalf-Row72-Register/1.0" },
    });
    return { url, ok: response.ok || (response.status >= 300 && response.status < 400), status: response.status };
  } catch {
    return { url, ok: false, status: 0 };
  }
}

async function probeLocal(pathName: string): Promise<{ path: string; status: number }> {
  try {
    const response = await fetch(`http://localhost:3000${pathName}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });
    return { path: pathName, status: response.status };
  } catch {
    return { path: pathName, status: 0 };
  }
}

async function main() {
  const register = loadRow72Register();
  const live = collectRow72LiveChecks();
  const model = buildRow72ReviewModel(register, live);
  const statusPages = await Promise.all(STATUS_URLS.map(headOk));
  const review = await probeLocal("/_internal/row72-vendor-dependency-review");
  const health = await probeLocal("/api/ops/health");
  const admin = await probeLocal("/ops/admin");
  const kpi = await probeLocal("/ops/admin/launch-kpi");
  const dashboard = await probeLocal("/ops/admin/launch-dashboard");

  const registerRaw = JSON.stringify(register);
  const secretsExposed = registerContainsSecrets(registerRaw) || live.secretsInRegister;

  const result = {
    generatedAt: new Date().toISOString(),
    secretsPrinted: false,
    secretsExposed,
    markedComplete: false,
    row73Started: register.row73Started,
    row74Started: register.row74Started,
    registerPath: ROW72_REGISTER_PATH,
    scorecard: model.scorecard,
    regression: model.regression,
    remainingRow72Blockers: model.remainingRow72Blockers,
    actualLaunchBlockers: model.actualLaunchBlockers,
    founderVerificationCount: model.founderVerification.length,
    live: {
      founderMediaMp4Count: live.founderMediaMp4Count,
      heygenEnvAbsent: live.heygenEnvAbsent,
      elevenLabsEnvAbsent: live.elevenLabsEnvAbsent,
      resendEnvAbsent: live.resendEnvAbsent,
      ga4EnvAbsent: live.ga4EnvAbsent,
      officialInstagram: live.officialInstagram,
      officialTikTok: live.officialTikTok,
      linkedinNotRequired: live.linkedinNotRequired,
      openaiKeyNamePresent: live.openaiKeyNamePresent,
      stripeKeyNamePresent: live.stripeKeyNamePresent,
      smtpNamesPresent: live.smtpNamesPresent,
      postgresNamesPresent: live.postgresNamesPresent,
      localEnvNameCount: live.localEnvNamesPresent.length,
    },
    http: {
      review,
      health,
      unauthenticatedAdmin: admin,
      unauthenticatedKpi: kpi,
      unauthenticatedDashboard: dashboard,
    },
    statusPages,
    readyForFounderAcceptance: model.readyForFounderAcceptance,
    finalStatus: model.finalStatus,
  };

  const out = path.join(process.cwd(), "ops/fab-5/runs/row-72-vendor-register-validation.json");
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ pass: model.readyForFounderAcceptance && !secretsExposed, finalStatus: model.finalStatus, out }, null, 2));
  if (!model.readyForFounderAcceptance || secretsExposed) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "row72_failed");
  process.exit(1);
});
