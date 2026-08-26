/**
 * Hosted Nia stand-up + three-agent validation. Never prints secrets.
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

async function post(
  url: string,
  secret: string,
  body: Record<string, unknown>,
): Promise<{ status: number; json: Record<string, unknown> | null; leaked: boolean }> {
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
  return { status: res.status, json, leaked: leak(text) };
}

async function main(): Promise<void> {
  const host = "website-two-psi-49.vercel.app";
  const niaUrl = `https://${host}/api/fab-5/nia/cycle`;
  const michelleUrl = `https://${host}/api/fab-5/michelle/cycle`;
  const imaniUrl = `https://${host}/api/fab-5/imani/heartbeat`;
  const secret = readEnvLocalName("CRON_SECRET");
  if (!secret) {
    console.log("CRON_SECRET_LOCAL=MISSING");
    process.exit(1);
  }
  const unauth = await fetch(niaUrl, { method: "GET" });
  const unauthText = await unauth.text();
  const key = `nia-${Date.now().toString(36)}`;
  const write1 = await post(niaUrl, secret, { durability: { action: "write", key } });
  const write2 = await post(niaUrl, secret, { durability: { action: "write", key } });
  const retrieve = await post(niaUrl, secret, { durability: { action: "retrieve", key } });
  const retry = await post(niaUrl, secret, { durability: { action: "retry", key } });
  const retrieve2 = await post(niaUrl, secret, { durability: { action: "retrieve", key } });
  const cycle = await post(niaUrl, secret, {
    trigger: "queue",
    acceptancePack: true,
    threeAgent: true,
    founderUnavailable: true,
    task: "Hosted Nia unattended cycle. Do not mutate production content. Do not change the launch date.",
  });
  const resolve = await post(niaUrl, secret, { durability: { action: "resolve", key } });
  const michelleReg = await post(michelleUrl, secret, {
    trigger: "queue",
    skipLiveModel: true,
    task: "Michelle regression after Nia stand-up. Do not change the launch date.",
  });
  const imaniReg = await post(imaniUrl, secret, {
    trigger: "queue",
    task: "Imani regression after Nia stand-up. Read-only. No writes.",
  });

  const retrieved = (retrieve.json?.retrieved ?? {}) as Record<string, unknown>;
  const retrieved2 = (retrieve2.json?.retrieved ?? {}) as Record<string, unknown>;
  const pack = (cycle.json?.acceptancePack ?? null) as Record<string, { pass?: boolean }> | null;
  const retryAfter = (retrieved2.retry ?? null) as { retryCount?: number } | null;
  const retryBefore = (retrieved.retry ?? null) as { retryCount?: number } | null;
  const tests = {
    unauth401: unauth.status === 401 && !/<html/i.test(unauthText),
    T1_T18: Boolean(
      pack?.T1_EXPERIENCE_PROMISE?.pass &&
        pack?.T2_TRIPLE_E?.pass &&
        pack?.T3_ACTUAL_VS_SPEC?.pass &&
        pack?.T4_RELEASE_BLOCK?.pass &&
        pack?.T5_INDEPENDENT_RETEST?.pass &&
        pack?.T6_SUBJECTIVE_PREFERENCE?.pass &&
        pack?.T7_CURRICULUM_COMPLETENESS?.pass &&
        pack?.T8_COHERENCE?.pass &&
        pack?.T9_TEACHABILITY?.pass &&
        pack?.T10_MEASURABILITY?.pass &&
        pack?.T11_ASSESSMENT_BOUNDARY?.pass &&
        pack?.T12_LEARNING_IMPROVEMENT?.pass &&
        pack?.T13_INNOVATION_FUTURE?.pass &&
        pack?.T14_LAUNCH_REQUIREMENT?.pass &&
        pack?.T15_SCOPE_DRIFT?.pass &&
        pack?.T16_COMPETITIVE?.pass &&
        pack?.T17_FUTURE_TREND?.pass &&
        pack?.T18_CATEGORY?.pass,
    ),
    T19: Boolean(pack?.T19_IMANI_HANDOFF?.pass),
    T20: Boolean(pack?.T20_MICHELLE_HANDOFF?.pass),
    T21: Boolean(pack?.T21_FOUNDER_UNAVAILABLE?.pass),
    T22: Boolean(retrieved.block && retrieved.eval && retrieved.run),
    T23: write1.json?.duplicate === false && write2.json?.duplicate === true,
    T24: Boolean(retryBefore && retryAfter && Number(retryAfter.retryCount) > Number(retryBefore.retryCount)),
    T25: Boolean(pack?.T25_SELF_CERTIFICATION?.pass),
    hosted: cycle.json?.hosted === true && cycle.json?.openaiLive === "PASS",
    persist: (cycle.json?.persist as { durable?: boolean } | undefined)?.durable === true,
    michelleReg: michelleReg.status === 200 && michelleReg.json?.hosted === true,
    imaniReg: imaniReg.status === 200,
  };
  const leaked = [write1, write2, retrieve, retry, retrieve2, cycle, resolve, michelleReg, imaniReg].some(
    (item) => item.leaked,
  );
  const evidence = {
    at: new Date().toISOString(),
    host,
    key,
    unauthStatus: unauth.status,
    niaRunId: cycle.json?.runId ?? null,
    openaiLive: cycle.json?.openaiLive ?? null,
    persist: cycle.json?.persist ?? null,
    tripleESource: cycle.json?.tripleESource ?? null,
    threeAgent: cycle.json?.threeAgent ?? null,
    michelleAcceptanceRecorded: cycle.json?.michelleAcceptanceRecorded ?? null,
    tests,
    pack,
    secretExposure: leaked ? "YES" : "NO",
  };
  const out = path.join("ops", "fab-5", "runs", "nia-hosted-validation.json");
  await writeFile(out, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`UNAUTH=${unauth.status}`);
  console.log(`NIA_RUN=${String(cycle.json?.runId)}`);
  console.log(`OPENAI=${String(cycle.json?.openaiLive)}`);
  console.log(`PERSIST=${String((cycle.json?.persist as { durable?: boolean } | undefined)?.durable)}`);
  console.log(`PACK_CORE=${String(tests.T1_T18)}`);
  console.log(`THREE_AGENT_IMANI=${String(tests.T19)}`);
  console.log(`THREE_AGENT_MICHELLE=${String(tests.T20)}`);
  console.log(`DURABLE=${String(tests.T22)}`);
  console.log(`IDEMPOTENT=${String(tests.T23)}`);
  console.log(`MICHELLE_REG=${String(tests.michelleReg)}`);
  console.log(`SECRET_EXPOSURE=${leaked ? "YES" : "NO"}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@"));
  process.exit(1);
});
