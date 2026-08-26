/**
 * Hosted Nia live-research validation. Never prints secrets.
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

  const pack = await post(niaUrl, secret, { researchPack: true });
  const tests = (pack.json?.tests ?? {}) as Record<string, { pass?: boolean; note?: string }>;
  const researchId = typeof pack.json?.researchId === "string" ? pack.json.researchId : "";
  const retrieve = await post(niaUrl, secret, { research: { action: "retrieve", key: researchId } });
  const michelleAssign = await post(michelleUrl, secret, {
    trigger: "event",
    skipLiveModel: true,
    task: "Request Nia live intelligence on the current U.S. federal minimum wage from official dol.gov sources. Do not change the launch date.",
    idempotencyKey: `michelle-nia-intel-${Date.now().toString(36)}`,
  });
  const niaCore = await post(niaUrl, secret, {
    trigger: "queue",
    skipLiveModel: true,
    task: "Nia core regression after live-research stand-up. Do not mutate production content. Do not change the launch date.",
  });
  const michelleReg = await post(michelleUrl, secret, {
    trigger: "queue",
    skipLiveModel: true,
    task: "Michelle regression after Nia live research. Do not change the launch date.",
  });
  const imaniReg = await post(imaniUrl, secret, {
    trigger: "queue",
    task: "Imani regression after Nia live research. Read-only. No writes.",
  });

  const required = [
    "T1_CURRENT_COMPETITOR_FACT",
    "T2_STALE_INFORMATION",
    "T3_FACT_VS_INFERENCE",
    "T4_MULTI_SOURCE_CROSS_CHECK",
    "T5_SOURCE_QUALITY",
    "T6_COMPETITIVE_INTELLIGENCE",
    "T7_FUTURE_TREND",
    "T8_OPPORTUNITY",
    "T9_SCOPE_DRIFT",
    "T10_TRUE_REQUIREMENT",
    "T11_MICHELLE_HANDOFF",
    "T12_TECHNICAL_HANDOFF",
    "T13_DURABILITY",
    "T14_DEDUPLICATION",
    "T15_RUNAWAY_CONTROL",
    "T16_CURRENTNESS",
    "T17_LEGAL_BOUNDARY",
    "T18_COMPUTER_INDEPENDENCE",
  ];
  const packPass = required.every((name) => tests[name]?.pass === true);
  const retrieveOk = retrieve.status === 200 && retrieve.json?.ok === true;
  const michelleAssignOk =
    michelleAssign.status === 200 &&
    Boolean((michelleAssign.json?.niaResearch as { status?: string } | undefined)?.status);
  const evidence = {
    at: new Date().toISOString(),
    host,
    architecture: pack.json?.architecture ?? null,
    newThirdPartyVendor: pack.json?.newThirdPartyVendor ?? false,
    researchId,
    packStatus: pack.status,
    packHosted: pack.json?.hosted ?? null,
    tests,
    packPass,
    retrieveOk,
    retrieveHosted: retrieve.json?.hosted ?? null,
    michelleAssign: {
      status: michelleAssign.status,
      niaResearch: michelleAssign.json?.niaResearch ?? null,
      hosted: michelleAssign.json?.hosted ?? null,
    },
    niaCore: {
      status: niaCore.status,
      hosted: niaCore.json?.hosted ?? null,
      openaiLive: niaCore.json?.openaiLive ?? null,
    },
    michelleReg: { status: michelleReg.status, hosted: michelleReg.json?.hosted ?? null },
    imaniReg: { status: imaniReg.status, hosted: imaniReg.json?.hosted ?? null, outcome: imaniReg.json?.outcome ?? null },
    secretExposure: [pack, retrieve, michelleAssign, niaCore, michelleReg, imaniReg].some((item) => item.leaked)
      ? "YES"
      : "NO",
    productionMutated: "NO",
  };
  const out = path.join("ops", "fab-5", "runs", "nia-live-research-hosted-validation.json");
  await writeFile(out, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`PACK_STATUS=${pack.status}`);
  console.log(`PACK_PASS=${String(packPass)}`);
  console.log(`RESEARCH_ID=${researchId}`);
  console.log(`RETRIEVE=${String(retrieveOk)}`);
  console.log(`MICHELLE_ASSIGN=${String(michelleAssignOk)}`);
  console.log(`NIA_CORE=${niaCore.status}`);
  console.log(`MICHELLE_REG=${michelleReg.status}`);
  console.log(`IMANI_REG=${imaniReg.status}`);
  console.log(`SECRET_EXPOSURE=${evidence.secretExposure}`);
  for (const name of required) {
    console.log(`${name}=${tests[name]?.pass === true ? "PASS" : "FAIL"}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@"));
  process.exit(1);
});
