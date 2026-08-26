/**
 * Hosted Imani heartbeat validation against Production.
 * Never prints secrets. Read-only besides the authenticated heartbeat GET.
 */
import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { imaniVercelInspect } from "@/lib/fab-5/vercel";

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
  return /sk_live_|sk_test_|rk_live_|rk_test_|sk-[A-Za-z0-9_-]{8,}|vcp_[A-Za-z0-9]+|whsec_|CRON_SECRET=/.test(value);
}

async function main(): Promise<void> {
  const inspect = await imaniVercelInspect();
  const host = (inspect.production?.aliases ?? [])
    .map((item) => item.replace(/^https?:\/\//, "").replace(/\/$/, ""))
    .find((item) => item.endsWith(".vercel.app") || item.endsWith("thebackhalf.org"));
  if (!host) {
    console.log("HOST=MISSING");
    process.exit(1);
  }
  const url = `https://${host}/api/fab-5/imani/heartbeat`;
  const unauth = await fetch(url, { method: "GET" });
  const unauthType = (unauth.headers.get("content-type") || "").split(";")[0];
  const unauthText = await unauth.text();
  const unauthHtml = /<html/i.test(unauthText);
  let unauthError = "n/a";
  if (!unauthHtml && unauthText.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(unauthText) as { error?: unknown };
      unauthError = typeof parsed.error === "string" ? parsed.error : "json";
    } catch {
      unauthError = "json_parse_failed";
    }
  }

  const secret = readEnvLocalName("CRON_SECRET");
  let authStatus: number | null = null;
  let hosted = false;
  let vercelEnv: string | null = null;
  let openai: string | null = null;
  let stripe: string | null = null;
  let outcome: string | null = null;
  let runId: string | null = null;
  let writeCharge = false;
  let refund = false;
  let finance = false;
  let founderOnly = false;
  let legal = false;
  let deployNotExecuted = false;
  let jsonAgent = "n/a";
  let authLeak = false;

  if (secret) {
    const auth = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
    });
    authStatus = auth.status;
    const body = await auth.text();
    authLeak = leak(body);
    if (body.trim().startsWith("{")) {
      const parsed = JSON.parse(body) as {
        agent?: unknown;
        hosted?: unknown;
        vercelEnv?: unknown;
        outcome?: unknown;
        runId?: unknown;
        systems?: { openaiLive?: unknown; stripeSandboxRead?: unknown };
        authority?: {
          writeChargeBlocked?: unknown;
          refundBlocked?: unknown;
          financialAdminBlocked?: unknown;
          founderOnlyBlocked?: unknown;
          legalConclusionBlocked?: unknown;
          deployNotExecuted?: unknown;
        };
      };
      jsonAgent = typeof parsed.agent === "string" ? parsed.agent : "absent";
      hosted = parsed.hosted === true;
      vercelEnv = typeof parsed.vercelEnv === "string" ? parsed.vercelEnv : null;
      outcome = typeof parsed.outcome === "string" ? parsed.outcome : null;
      runId = typeof parsed.runId === "string" ? parsed.runId : null;
      openai = typeof parsed.systems?.openaiLive === "string" ? parsed.systems.openaiLive : null;
      stripe = typeof parsed.systems?.stripeSandboxRead === "string" ? parsed.systems.stripeSandboxRead : null;
      writeCharge = parsed.authority?.writeChargeBlocked === true;
      refund = parsed.authority?.refundBlocked === true;
      finance = parsed.authority?.financialAdminBlocked === true;
      founderOnly = parsed.authority?.founderOnlyBlocked === true;
      legal = parsed.authority?.legalConclusionBlocked === true;
      deployNotExecuted = parsed.authority?.deployNotExecuted === true;
    }
  }

  const evidence = {
    at: new Date().toISOString(),
    hostKind: host.endsWith("thebackhalf.org") ? "apex_or_www" : "vercel_app",
    unauthStatus: unauth.status,
    unauthType,
    unauthHtml,
    unauthError,
    cronSecretLocal: secret ? "PRESENT" : "MISSING",
    authStatus,
    jsonAgent,
    hosted,
    vercelEnv,
    outcome,
    runId,
    openai,
    stripe,
    writeCharge,
    refund,
    finance,
    founderOnly,
    legal,
    deployNotExecuted,
    secretExposure: authLeak ? "YES" : "NO",
  };
  await writeFile(
    path.join(process.cwd(), "ops", "fab-5", "runs", "imani-heartbeat-hosted-validation.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );

  console.log(`UNAUTH_STATUS=${String(unauth.status)}`);
  console.log(`UNAUTH_HTML=${String(unauthHtml)}`);
  console.log(`UNAUTH_ERROR=${unauthError}`);
  console.log(`CRON_SECRET_LOCAL=${secret ? "PRESENT" : "MISSING"}`);
  console.log(`AUTH_STATUS=${authStatus === null ? "NOT_TESTED" : String(authStatus)}`);
  console.log(`AGENT=${jsonAgent}`);
  console.log(`HOSTED=${String(hosted)}`);
  console.log(`VERCEL_ENV=${vercelEnv ?? "null"}`);
  console.log(`OUTCOME=${outcome ?? "null"}`);
  console.log(`RUN_ID_PRESENT=${runId ? "YES" : "NO"}`);
  console.log(`OPENAI=${openai ?? "null"}`);
  console.log(`STRIPE=${stripe ?? "null"}`);
  console.log(`WRITE_CHARGE_BLOCKED=${String(writeCharge)}`);
  console.log(`REFUND_BLOCKED=${String(refund)}`);
  console.log(`FINANCE_BLOCKED=${String(finance)}`);
  console.log(`FOUNDER_ONLY_BLOCKED=${String(founderOnly)}`);
  console.log(`LEGAL_BLOCKED=${String(legal)}`);
  console.log(`DEPLOY_NOT_EXECUTED=${String(deployNotExecuted)}`);
  console.log(`SECRET_EXPOSURE=${authLeak ? "YES" : "NO"}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    message.replace(/sk_(live|test)_[A-Za-z0-9]+/g, "[redacted]").replace(/vcp_[A-Za-z0-9]+/g, "[redacted]"),
  );
  process.exit(1);
});
