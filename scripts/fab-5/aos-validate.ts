/**
 * Permanent Agent Operating System validation. Never prints secrets.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { ingestCommandCenterSnapshot, loadCommandCenterSnapshot } from "@/lib/fab-5/aos/ingest";
import { openFounderGate, runAosTick } from "@/lib/fab-5/aos/engine";
import { smsConfigured } from "@/lib/fab-5/aos/notify";
import { aosConfigured, enqueueWork, getWork } from "@/lib/fab-5/aos/store";
import { runAosValidation } from "@/lib/fab-5/aos/validate";
import { loadPostgresEnvFromLocalFile } from "@/lib/marketing-kpi/db";

const TWILIO_WORK_ID = "aos-founder-twilio-sms";

async function ensureUrgentSmsDecision(): Promise<Record<string, unknown>> {
  if (smsConfigured()) {
    return { needed: false, reason: "twilio_configured" };
  }
  const existing = await getWork(TWILIO_WORK_ID);
  if (existing?.founderDecisionId && existing.status === "FOUNDER_GATED") {
    return { needed: true, decisionAlreadyOpen: existing.founderDecisionId };
  }
  const item = existing ?? await enqueueWork({
    workId: TWILIO_WORK_ID,
    source: "company_objective",
    sourceReference: "AOS-31-urgent-sms",
    title: "Authorize urgent Founder text (SMS) delivery",
    description:
      "Urgent Founder decisions require dashboard + email + text. Email uses existing Workspace SMTP. SMS requires a Founder-authorized vendor (Twilio or equivalent) and Founder-held destination configuration. Until authorized, urgent text is recorded as not_configured and is not claimed as sent.",
    ownerAgent: "michelle",
    actionClass: "D",
    runtimeClass: "hosted",
    priority: 1,
    nextAction: "await_founder",
  });
  const decisionId = await openFounderGate(
    item,
    "Urgent Founder text cannot send until an SMS vendor is authorized and configured. Dashboard and email paths remain available.",
    {
      severity: "normal",
      holdSend: false,
      recommendation:
        "Approve Twilio (or equivalent) for Founder-only urgent SMS, with FOUNDER_NOTIFY_SMS and TWILIO_* held as server secrets — or accept email + dashboard only for urgent escalation until then.",
    },
  );
  return { needed: true, decisionId };
}

async function main(): Promise<void> {
  loadPostgresEnvFromLocalFile();
  const validation = await runAosValidation();
  let founderSmsDecision: Record<string, unknown> | null = null;
  let ingest: Record<string, unknown> | null = null;
  if (validation.configured && validation.failed === 0) {
    try {
      founderSmsDecision = await ensureUrgentSmsDecision();
    } catch (error) {
      founderSmsDecision = { error: error instanceof Error ? error.message : "decision_failed" };
    }
    try {
      const snapshot = await loadCommandCenterSnapshot();
      const result = await ingestCommandCenterSnapshot(snapshot);
      const tick = await runAosTick({ includeTest: false, engineeringRuntime: false, maxPerAgent: 2 });
      ingest = {
        ingested: result.ingested,
        skippedKim: result.skippedKim,
        skippedComplete: result.skippedComplete,
        skippedInvalid: result.skippedInvalid,
        tickClaimed: tick.claimed.length,
        tickOk: tick.ok,
        skippedEngineering: tick.skippedEngineering,
        heartbeats: true,
      };
    } catch (error) {
      ingest = { error: error instanceof Error ? error.message : "ingest_failed" };
    }
  }

  const report = {
    at: new Date().toISOString(),
    configured: validation.configured,
    passed: validation.passed,
    failed: validation.failed,
    tests: validation.tests,
    defectsFound: validation.defectsFound,
    defectsCorrected: validation.defectsCorrected,
    ingest,
    founderSmsDecision,
    smsClaim: "Twilio is optional. Unconfigured SMS is not reported as sent.",
    engineeringRuntime:
      "Hosted Vercel ticks launch and poll Cursor Cloud Agents for runtime_class=engineering. Isolated branch + PR; no silent merge. CURSOR_API_KEY required on the host.",
    workstationNote:
      "A–P require production Postgres. Vercel Production already has POSTGRES_URL. This workstation .env.local does not. Vercel CLI env pull writes non-decryptable placeholders for sensitive keys. Do not paste connection strings into chat.",
  };
  const out = path.join("ops", "fab-5", "runs", "aos-permanent-validation.json");
  await writeFile(out, JSON.stringify(report, null, 2), "utf8");
  console.log(`AOS_VALIDATION ${validation.passed}/${validation.tests.length} PASS configured=${validation.configured}`);
  if (!aosConfigured()) process.exit(1);
  if (validation.failed > 0) process.exit(1);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "aos_validate_failed";
  console.error(message === "Invalid URL" ? "postgres_url_unparseable" : message);
  process.exit(1);
});
