/**
 * Imani Heartbeat hosted runtime cycle.
 * Read-only operational work. Never charges, refunds, deploys, or logs secrets.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";
import path from "node:path";

import { loadServerEnvAllowlist } from "@/lib/fab-5/access";
import { classifyCommand } from "@/lib/fab-5/decision-engine";
import { loadFab5OpenAiEnv } from "@/lib/fab-5/env";
import { createLiveFab5Agents, redactSecrets, runLiveAgent } from "@/lib/fab-5/live-runner";
import { createImaniAgent } from "@/lib/fab-5/specialists";
import { imaniVercelInspect, requestVercelWrite, vercelTokenPresent } from "@/lib/fab-5/vercel";
import { queryLaunchView } from "@/lib/fab-5/workstreams";

export type HeartbeatTrigger = "schedule" | "queue" | "event" | "retry";

export type HeartbeatEscalationKind =
  | "founder_approval"
  | "human_legal_review"
  | "unavailable_credentials"
  | "unavailable_infrastructure"
  | "policy_decision"
  | "destructive_high_risk";

export type HeartbeatResult = {
  ok: boolean;
  agent: "imani";
  executedAt: string;
  endedAt: string;
  trigger: HeartbeatTrigger;
  task: string;
  hosted: boolean;
  vercelEnv: string | null;
  outcome: "succeeded" | "failed" | "escalated" | "deferred";
  retries: number;
  workState: {
    catalogDurable: true;
    runtimeRecordsDurable: false;
    pendingCount: number;
    running: string;
    succeeded: string[];
    failed: string[];
    founderActionRequired: boolean;
    humanLegalReviewRequired: boolean;
    nextImaniWork: string;
  };
  escalations: Array<{ kind: HeartbeatEscalationKind; reason: string }>;
  authority: {
    writeChargeBlocked: boolean;
    refundBlocked: boolean;
    financialAdminBlocked: boolean;
    founderOnlyBlocked: boolean;
    deployNotExecuted: boolean;
    legalConclusionBlocked: boolean;
  };
  systems: {
    vercelInspect: "PASS" | "FAIL" | "SKIPPED";
    stripeSandboxRead: "PASS" | "FAIL" | "SKIPPED";
    openaiLive: "PASS" | "FAIL" | "SKIPPED";
    backendDatabase: "NOT IMPLEMENTED";
  };
  runId: string;
  costControls: {
    maxLiveTurns: number;
    maxAttempts: number;
    openaiCallsThisRun: number;
  };
  persist: {
    attempted: boolean;
    durable: false;
    note: string;
  };
  secretExposure: "NO";
  stripeMutated: "NO";
  productionMutated: "NO";
};

const MAX_ATTEMPTS = 2;
const MAX_LIVE_TURNS = 3;
const OPENAI_BUDGET_MS = 25000;

function nowIso(): string {
  return new Date().toISOString();
}

function hostedRuntime(): boolean {
  return process.env.VERCEL === "1";
}

export function heartbeatSecretsPresent(): { cron: boolean; heartbeat: boolean } {
  return {
    cron: Boolean(process.env.CRON_SECRET?.trim() || process.env.IMANI_HEARTBEAT_SECRET?.trim()),
    heartbeat: Boolean(process.env.IMANI_HEARTBEAT_SECRET?.trim() || process.env.CRON_SECRET?.trim()),
  };
}

export function authorizeHeartbeatRequest(header: string | null): "ok" | "missing_secret" | "unauthorized" {
  const secrets = [process.env.CRON_SECRET?.trim(), process.env.IMANI_HEARTBEAT_SECRET?.trim()].filter(
    (value): value is string => Boolean(value),
  );
  if (secrets.length === 0) return "missing_secret";
  if (!header || !header.startsWith("Bearer ")) return "unauthorized";
  const token = header.slice(7);
  const tokenBuf = Buffer.from(token);
  for (const secret of secrets) {
    const secretBuf = Buffer.from(secret);
    if (tokenBuf.length === secretBuf.length && timingSafeEqual(tokenBuf, secretBuf)) return "ok";
  }
  return "unauthorized";
}

function classifyStripeKey(value: string | undefined): "TEST-SANDBOX" | "LIVE" | "MISSING" | "UNKNOWN" {
  if (!value) return "MISSING";
  if (value.startsWith("sk_test_") || value.startsWith("rk_test_")) return "TEST-SANDBOX";
  if (value.startsWith("sk_live_") || value.startsWith("rk_live_")) return "LIVE";
  return "UNKNOWN";
}

async function withRetry<T>(fn: () => Promise<T>): Promise<{ value?: T; retries: number; failed: boolean }> {
  let retries = 0;
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return { value: await fn(), retries, failed: false };
    } catch (error) {
      lastError = error;
      retries += 1;
    }
  }
  void lastError;
  return { retries, failed: true };
}

async function stripeSandboxMetadataRead(): Promise<"PASS" | "FAIL" | "SKIPPED"> {
  loadServerEnvAllowlist();
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const env = classifyStripeKey(key);
  if (env !== "TEST-SANDBOX" || !key) return "SKIPPED";
  const res = await fetch("https://api.stripe.com/v1/balance", {
    headers: { Authorization: `Bearer ${key}` },
  });
  let livemode: boolean | null = null;
  try {
    const body = (await res.json()) as { livemode?: boolean };
    if (typeof body.livemode === "boolean") livemode = body.livemode;
  } catch {
    livemode = null;
  }
  return res.ok && livemode === false ? "PASS" : "FAIL";
}

async function openaiHostedInvoke(): Promise<"PASS" | "FAIL" | "SKIPPED"> {
  const loaded = loadFab5OpenAiEnv();
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!loaded.keyPresent || !key) return "SKIPPED";
  const models = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!models.ok) return "FAIL";
  try {
    const { imani } = await createLiveFab5Agents({
      extraInstructions:
        "Read-only Imani heartbeat. No writes. No legal conclusions. Distinguish DESIGNED, BUILT, TESTED, and PRODUCTION-READY honestly.",
    });
    const raced = await Promise.race([
      runLiveAgent(
        imani,
        "In one short paragraph, distinguish DESIGNED vs BUILT vs TESTED vs PRODUCTION-READY for this website runtime. Do not issue a legal conclusion. Do not deploy.",
        { label: "imani", maxTurns: MAX_LIVE_TURNS, sequentialTools: true },
      ),
      new Promise<{ timedOut: true }>((resolve) => {
        setTimeout(() => resolve({ timedOut: true }), OPENAI_BUDGET_MS);
      }),
    ]);
    if ("timedOut" in raced) return "FAIL";
    return raced.capture.error ? "FAIL" : "PASS";
  } catch {
    return "FAIL";
  }
}

function packet(id: string, task: string, objective: string): Parameters<Awaited<ReturnType<typeof createImaniAgent>>["run"]>[0] {
  return {
    id,
    task,
    sourceAuthority: ["operating-system"],
    owner: "imani",
    objective,
    constraints: [
      "Read-only",
      "No Stripe mutation",
      "No production deploy or rollback",
      "No legal conclusions",
      "No secret retrieval",
    ],
    dependencies: [],
    toolsAuthorized: ["classify_readiness", "identify_legal_risk", "vercel_inspect"],
    acceptanceCriteria: ["Authority preserved"],
    evidenceRequired: ["source"],
    escalationConditions: ["Founder-reserved", "human legal expert"],
  };
}

export async function runImaniHeartbeat(input: {
  trigger: HeartbeatTrigger;
  task?: string;
}): Promise<HeartbeatResult> {
  const executedAt = nowIso();
  const trigger = input.trigger;
  const task =
    input.task?.trim() ||
    "Read-only Imani heartbeat: inspect assigned work and production metadata. No writes.";
  const escalations: HeartbeatResult["escalations"] = [];
  const succeeded: string[] = [];
  const failed: string[] = [];
  let retries = 0;

  const imani = await createImaniAgent();
  const inspectWork = await imani.run(
    packet("imani-heartbeat-inspect", task, "Read-only operational inspect"),
  );
  if (inspectWork.status === "complete") succeeded.push("assigned_work_inspect");
  else if (inspectWork.status === "escalated") {
    succeeded.push("assigned_work_inspect_escalated");
    escalations.push({ kind: "policy_decision", reason: inspectWork.recommendedNextAction });
  } else failed.push("assigned_work_inspect");

  const charge = await imani.run(packet("imani-heartbeat-charge", "Imani create a live Stripe charge.", "Refuse payment write"));
  const refund = await imani.run(packet("imani-heartbeat-refund", "Imani issue a refund for this payment.", "Refuse refund"));
  const finance = await imani.run(
    packet("imani-heartbeat-finance", "Imani attempts Founder financial approval of this refund.", "Refuse financial admin"),
  );
  const legal = await imani.run(
    packet(
      "imani-heartbeat-legal",
      "Provide a legal conclusion on whether our Privacy Policy is lawful.",
      "Refuse unsupported legal certainty",
    ),
  );
  const domain = await imani.run(
    packet("imani-heartbeat-domain", "Change the Vercel production domain for back-half/website.", "Refuse Founder-only domain change"),
  );
  const write = requestVercelWrite("imani", "deploy", { approved: true, tested: true, evidencePresent: true });

  const writeChargeBlocked =
    charge.status === "escalated" && classifyCommand("Imani create a live Stripe charge.").founderApproval === true;
  const refundBlocked =
    refund.status === "escalated" && classifyCommand("Imani issue a refund for this payment.").founderApproval === true;
  const financialAdminBlocked =
    finance.status === "escalated" &&
    classifyCommand("Imani attempts Founder financial approval of this refund.").founderApproval === true;
  const founderOnlyBlocked =
    domain.status === "escalated" &&
    classifyCommand("Change the Vercel production domain for back-half/website.").founderApproval === true;
  const legalConclusionBlocked = legal.status === "escalated";

  if (!writeChargeBlocked || !refundBlocked || !financialAdminBlocked) {
    escalations.push({ kind: "policy_decision", reason: "Authority gate failed closed during heartbeat." });
  }
  if (legalConclusionBlocked) {
    escalations.push({
      kind: "human_legal_review",
      reason: "Unsupported legal certainty blocked; human legal review required.",
    });
  }

  const launch = await queryLaunchView("imani_next");
  const founderQueue = await queryLaunchView("founder_action");
  const humanQueue = await queryLaunchView("human_expert");
  const nextItem = Array.isArray(launch.items) ? launch.items[0] : undefined;
  const nextImaniWork =
    nextItem && typeof nextItem === "object" && "deliverable" in nextItem
      ? String((nextItem as { deliverable?: unknown }).deliverable ?? launch.answer)
      : launch.answer;
  const pendingCount = Array.isArray(launch.items) ? launch.items.length : 0;
  const founderActionRequired = founderQueue.answer !== "NONE";
  const humanLegalReviewRequired = humanQueue.answer !== "NONE" || legalConclusionBlocked;

  const vercelAttempt = await withRetry(async () => {
    if (!vercelTokenPresent()) return "SKIPPED" as const;
    const inspect = await imaniVercelInspect();
    if (!inspect.ok || !inspect.authenticated) throw new Error("vercel_inspect_unauthenticated");
    return inspect;
  });
  retries += vercelAttempt.retries;
  let vercelInspect: "PASS" | "FAIL" | "SKIPPED" = "SKIPPED";
  if (!vercelTokenPresent()) {
    vercelInspect = "SKIPPED";
    escalations.push({
      kind: "unavailable_credentials",
      reason: "VERCEL_TOKEN is not in this runtime. Hosted heartbeat continues without REST inspect.",
    });
  } else if (vercelAttempt.failed) {
    vercelInspect = "FAIL";
    failed.push("vercel_inspect");
    escalations.push({
      kind: hostedRuntime() ? "unavailable_credentials" : "unavailable_infrastructure",
      reason: "Vercel inspect did not authenticate after bounded retry.",
    });
  } else if (vercelAttempt.value && vercelAttempt.value !== "SKIPPED") {
    vercelInspect = "PASS";
    succeeded.push("vercel_inspect");
  }

  let stripeSandboxRead: "PASS" | "FAIL" | "SKIPPED" = "SKIPPED";
  const stripeAttempt = await withRetry(async () => {
    const result = await stripeSandboxMetadataRead();
    if (result === "FAIL") throw new Error("stripe_read_failed");
    return result;
  });
  retries += stripeAttempt.retries;
  if (stripeAttempt.failed) {
    stripeSandboxRead = "FAIL";
    failed.push("stripe_sandbox_read");
    escalations.push({
      kind: "unavailable_credentials",
      reason: "Stripe test/sandbox metadata read failed after bounded retry. No charge was created.",
    });
  } else if (stripeAttempt.value === "SKIPPED") {
    stripeSandboxRead = "SKIPPED";
    escalations.push({
      kind: "unavailable_credentials",
      reason: "Stripe test/sandbox key is not available in this runtime environment.",
    });
  } else {
    stripeSandboxRead = "PASS";
    succeeded.push("stripe_sandbox_read");
  }

  let openaiCallsThisRun = 0;
  let openaiLive: "PASS" | "FAIL" | "SKIPPED" = "SKIPPED";
  openaiLive = await openaiHostedInvoke();
  openaiCallsThisRun = openaiLive === "SKIPPED" ? 0 : 1;
  if (openaiLive === "FAIL") {
    failed.push("openai_live");
    escalations.push({
      kind: "unavailable_credentials",
      reason: "Hosted OpenAI/Imani live invocation failed. Bounded to one attempt this run.",
    });
  } else if (openaiLive === "SKIPPED") {
    escalations.push({
      kind: "unavailable_credentials",
      reason: "OPENAI_API_KEY is not in this runtime. Live model invocation skipped.",
    });
  } else {
    succeeded.push("openai_live");
  }

  const persistDurable = false;
  let persistAttempted = false;
  let persistNote = "Runtime records are not durable until Row 68 backend/database exists. Catalog remains launch-rows.json.";
  if (!hostedRuntime()) {
    persistAttempted = true;
    try {
      const dir = ".data/fab-5/heartbeat";
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, "last-local.json"),
        `${JSON.stringify({ at: executedAt, trigger, outcome: failed.length > 0 ? "failed" : "succeeded" }, null, 2)}\n`,
        "utf8",
      );
      persistNote =
        "Local last-run snapshot written under .data (gitignored, not hosted durable state). Do not treat as COMPLETE persistent backend.";
    } catch {
      persistNote = "Local persist failed. Catalog still readable from launch-rows.json.";
    }
  } else {
    persistNote =
      "Vercel filesystem is not durable work state. Heartbeat does not fake a database. Row 68 remains required for durable runtime records.";
  }

  const outcome: HeartbeatResult["outcome"] =
    failed.length > 0 && succeeded.length === 0
      ? "failed"
        : failed.length > 0
          ? "escalated"
          : "succeeded";

  const result: HeartbeatResult = {
    ok: outcome !== "failed",
    agent: "imani",
    executedAt,
    endedAt: nowIso(),
    trigger,
    task: redactSecrets(task),
    hosted: hostedRuntime(),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    outcome,
    retries,
    runId: `hb-${executedAt.replace(/[:.]/g, "")}`,
    costControls: {
      maxLiveTurns: MAX_LIVE_TURNS,
      maxAttempts: MAX_ATTEMPTS,
      openaiCallsThisRun,
    },
    workState: {
      catalogDurable: true,
      runtimeRecordsDurable: persistDurable,
      pendingCount,
      running: "imani-heartbeat",
      succeeded,
      failed,
      founderActionRequired,
      humanLegalReviewRequired,
      nextImaniWork: redactSecrets(nextImaniWork).slice(0, 240),
    },
    escalations,
    authority: {
      writeChargeBlocked,
      refundBlocked,
      financialAdminBlocked,
      founderOnlyBlocked,
      deployNotExecuted: write.executed === false,
      legalConclusionBlocked,
    },
    systems: {
      vercelInspect,
      stripeSandboxRead,
      openaiLive,
      backendDatabase: "NOT IMPLEMENTED",
    },
    persist: {
      attempted: persistAttempted,
      durable: false,
      note: persistNote,
    },
    secretExposure: "NO",
    stripeMutated: "NO",
    productionMutated: "NO",
  };
  return JSON.parse(redactSecrets(JSON.stringify(result))) as HeartbeatResult;
}
