/**
 * Hosted Michelle durability validation against Production. Never prints secrets.
 */
import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

function normalizeSecret(value: string): string {
  let next = value.trim().replace(/^\uFEFF/, "");
  if (
    (next.startsWith('"') && next.endsWith('"')) ||
    (next.startsWith("'") && next.endsWith("'"))
  ) {
    next = next.slice(1, -1).trim();
  }
  return next;
}

function readEnvLocalName(name: string): string | undefined {
  const filePath = path.join(process.cwd(), ".env.local");
  if (!existsSync(filePath)) return undefined;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let key = line.slice(0, eq).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    if (key !== name) continue;
    const value = normalizeSecret(line.slice(eq + 1));
    return value.length > 0 ? value : undefined;
  }
  return undefined;
}

function leak(value: string): boolean {
  return /sk_live_|sk_test_|rk_live_|rk_test_|sk-[A-Za-z0-9_-]{8,}|vcp_[A-Za-z0-9]+|whsec_|CRON_SECRET=|postgres(?:ql)?:\/\/[^@\s]+@/.test(
    value,
  );
}

async function michellePost(
  url: string,
  secret: string,
  body: Record<string, unknown>,
): Promise<{ status: number; json: Record<string, unknown> | null; text: string; leaked: boolean }> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const json = text.trim().startsWith("{") ? (JSON.parse(text) as Record<string, unknown>) : null;
  return { status: res.status, json, text, leaked: leak(text) };
}

async function main(): Promise<void> {
  const host = "website-two-psi-49.vercel.app";
  const url = `https://${host}/api/fab-5/michelle/cycle`;
  const secret = readEnvLocalName("CRON_SECRET");
  if (!secret) {
    console.log("CRON_SECRET_LOCAL=MISSING");
    process.exit(1);
  }
  const key = `dur-${Date.now().toString(36)}`;
  const write1 = await michellePost(url, secret, { durability: { action: "write", key } });
  const write2 = await michellePost(url, secret, { durability: { action: "write", key } });
  const retrieve = await michellePost(url, secret, { durability: { action: "retrieve", key } });
  const retry = await michellePost(url, secret, { durability: { action: "retry", key } });
  const retrieve2 = await michellePost(url, secret, { durability: { action: "retrieve", key } });
  const regression = await michellePost(url, secret, {
    trigger: "queue",
    acceptancePack: true,
    founderUnavailable: true,
    task: "Targeted Michelle regression after durable state. Do not change the launch date.",
  });
  const resolve = await michellePost(url, secret, { durability: { action: "resolve", key } });

  const retrieved = (retrieve.json?.retrieved ?? {}) as Record<string, unknown>;
  const retrieved2 = (retrieve2.json?.retrieved ?? {}) as Record<string, unknown>;
  const decision = retrieved.decision as Record<string, unknown> | null;
  const founder = retrieved.founder as Record<string, unknown> | null;
  const readiness = retrieved.readiness as Record<string, unknown> | null;
  const run = retrieved.run as Record<string, unknown> | null;
  const blocker = retrieved.blocker as Record<string, unknown> | null;
  const retryState = retrieved.retry as Record<string, unknown> | null;
  const retryAfter = retrieved2.retry as Record<string, unknown> | null;
  const human = retrieved.human as Record<string, unknown> | null;
  const dependency = retrieved.dependency as Record<string, unknown> | null;
  const pack = (regression.json?.acceptancePack ?? null) as Record<string, { pass?: boolean }> | null;

  const tests = {
    T1_DECISION: Boolean(decision && decision.id === `md-${key}`),
    T2_FOUNDER_ACTION: Boolean(founder && founder.resolved === false),
    T3_READINESS: Boolean(readiness && readiness.state === "BLOCKED"),
    T4_EXECUTION_HISTORY: Boolean(run && run.runId === `run-${key}`),
    T5_BLOCKER: Boolean(blocker && blocker.status === "open"),
    T6_RETRY: Boolean(
      retryState &&
        Number(retryState.retryCount) >= 1 &&
        retryAfter &&
        Number(retryAfter.retryCount) > Number(retryState.retryCount),
    ),
    T7_IDEMPOTENCY: write1.json?.duplicate === false && write2.json?.duplicate === true,
    T8_COMPUTER_INDEPENDENT:
      write1.json?.hosted === true && retrieve.json?.hosted === true && write1.json?.durable === true,
    HUMAN_EXPERT: Boolean(human && human.status === "open"),
    DEPENDENCY: Boolean(dependency && dependency.founderDependency === true),
    FOUNDER_RESOLVED_AFTER: resolve.json?.founderResolved === true,
    REGRESSION: Boolean(
      pack &&
        pack.T1_SOURCE_OF_TRUTH?.pass &&
        pack.T2_DECISION_LOG?.pass &&
        pack.T3_CONTRADICTION?.pass &&
        pack.T4_READINESS_REGISTER?.pass &&
        pack.T5_FOUNDER_ACTION_LIST?.pass &&
        pack.T6_EVIDENCE?.pass &&
        pack.T16_IMANI_DELEGATION?.pass,
    ),
  };

  const leaked = [write1, write2, retrieve, retry, retrieve2, regression, resolve].some((item) => item.leaked);
  const evidence = {
    at: new Date().toISOString(),
    host,
    key,
    write1: { status: write1.status, created: write1.json?.created ?? null, duplicate: write1.json?.duplicate ?? null, durable: write1.json?.durable ?? null, error: write1.json?.error ?? null },
    write2: { status: write2.status, duplicate: write2.json?.duplicate ?? null },
    retrieveStatus: retrieve.status,
    retry: retry.json?.retry ?? null,
    retrieve2Retry: retryAfter,
    resolve: { status: resolve.status, founderResolved: resolve.json?.founderResolved ?? null },
    regression: {
      status: regression.status,
      hosted: regression.json?.hosted ?? null,
      openaiLive: regression.json?.openaiLive ?? null,
      persist: regression.json?.persist ?? null,
      imaniDelegation: regression.json?.imaniDelegation ?? null,
      nia: regression.json?.nia ?? null,
    },
    tests,
    secretExposure: leaked ? "YES" : "NO",
  };
  const out = path.join("ops", "fab-5", "runs", "michelle-durable-validation.json");
  await writeFile(out, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`KEY=${key}`);
  console.log(`WRITE1_DURABLE=${String(write1.json?.durable)}`);
  console.log(`WRITE1_ERROR=${String(write1.json?.error ?? "NONE")}`);
  console.log(`T1_DECISION=${String(tests.T1_DECISION)}`);
  console.log(`T2_FOUNDER=${String(tests.T2_FOUNDER_ACTION)}`);
  console.log(`T3_READINESS=${String(tests.T3_READINESS)}`);
  console.log(`T4_RUN=${String(tests.T4_EXECUTION_HISTORY)}`);
  console.log(`T5_BLOCKER=${String(tests.T5_BLOCKER)}`);
  console.log(`T6_RETRY=${String(tests.T6_RETRY)}`);
  console.log(`T7_IDEMPOTENCY=${String(tests.T7_IDEMPOTENCY)}`);
  console.log(`T8_HOSTED=${String(tests.T8_COMPUTER_INDEPENDENT)}`);
  console.log(`REGRESSION=${String(tests.REGRESSION)}`);
  console.log(`SECRET_EXPOSURE=${leaked ? "YES" : "NO"}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@"));
  process.exit(1);
});
