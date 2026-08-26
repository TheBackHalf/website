/**
 * Imani heartbeat runtime validation.
 * Never prints secrets. Does not deploy. Does not mutate Stripe.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { authorizeHeartbeatRequest, runImaniHeartbeat } from "@/lib/fab-5/heartbeat";
import { imaniVercelInspect } from "@/lib/fab-5/vercel";

function leak(value: string): boolean {
  return /sk_live_|sk_test_|sk-[A-Za-z0-9_-]{8,}|vcp_[A-Za-z0-9]+|whsec_|CRON_SECRET=/.test(value);
}

async function main(): Promise<void> {
  const local = await runImaniHeartbeat({ trigger: "schedule" });
  const serialized = JSON.stringify(local);
  const secretExposure = leak(serialized) ? "YES" : "NO";
  const authMissing = authorizeHeartbeatRequest("Bearer test") === "missing_secret" || authorizeHeartbeatRequest("Bearer test") === "unauthorized";
  const authNoHeader = authorizeHeartbeatRequest(null) !== "ok";

  const inspect = await imaniVercelInspect();
  const aliases = inspect.production?.aliases ?? [];
  let hostedHttp: number | null = null;
  let hostedHostKind = "none";
  const host = aliases
    .map((item) => item.replace(/^https?:\/\//, "").replace(/\/$/, ""))
    .find((item) => item.endsWith(".vercel.app") || item.endsWith("thebackhalf.org"));
  if (host) {
    hostedHostKind = host.endsWith("thebackhalf.org") ? "apex_or_www" : "vercel_app";
    const res = await fetch(`https://${host}/api/fab-5/imani/heartbeat`, { method: "GET" });
    hostedHttp = res.status;
  }

  const evidence = {
    at: new Date().toISOString(),
    architecture: "Existing Vercel production project + Next.js route + daily Cron GET",
    files: [
      "lib/fab-5/heartbeat.ts",
      "app/api/fab-5/imani/heartbeat/route.ts",
      "vercel.json",
      "lib/fab-5/vercel.ts",
      "lib/fab-5/index.ts",
      ".env.example",
    ],
    localOutcome: local.outcome,
    hosted: local.hosted,
    vercelEnv: local.vercelEnv,
    authority: local.authority,
    systems: local.systems,
    persistDurable: local.persist.durable,
    secretExposure,
    stripeMutated: local.stripeMutated,
    productionMutated: local.productionMutated,
    authLayerRejectsWithoutSecret: authMissing && authNoHeader,
    productionHeartbeatPath: "/api/fab-5/imani/heartbeat",
    productionHeartbeatHttp: hostedHttp,
    productionHeartbeatLooksLikeHtmlCatchall: hostedHttp === 200,
    productionHostKind: hostedHostKind,
    vercelEnvNames: {
      OPENAI_API_KEY: inspect.envNames.includes("OPENAI_API_KEY"),
      STRIPE_SECRET_KEY: inspect.envNames.includes("STRIPE_SECRET_KEY"),
      VERCEL_TOKEN: inspect.envNames.includes("VERCEL_TOKEN"),
      CRON_SECRET: inspect.envNames.includes("CRON_SECRET"),
      IMANI_HEARTBEAT_SECRET: inspect.envNames.includes("IMANI_HEARTBEAT_SECRET"),
    },
    computerOff: "NOT PROVEN",
    note: "Hosted cron cannot authenticate until CRON_SECRET exists in Vercel Production env. Env changes are Founder-gated.",
  };

  const evidenceRel = "ops/fab-5/runs/imani-heartbeat-runtime.json";
  await writeFile(path.join(process.cwd(), evidenceRel), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  console.log(`LOCAL_OUTCOME=${local.outcome}`);
  console.log(`LOCAL_HOSTED=${String(local.hosted)}`);
  console.log(`WRITE_CHARGE_BLOCKED=${String(local.authority.writeChargeBlocked)}`);
  console.log(`REFUND_BLOCKED=${String(local.authority.refundBlocked)}`);
  console.log(`FINANCE_BLOCKED=${String(local.authority.financialAdminBlocked)}`);
  console.log(`FOUNDER_ONLY_BLOCKED=${String(local.authority.founderOnlyBlocked)}`);
  console.log(`LEGAL_BLOCKED=${String(local.authority.legalConclusionBlocked)}`);
  console.log(`DEPLOY_NOT_EXECUTED=${String(local.authority.deployNotExecuted)}`);
  console.log(`VERCEL_INSPECT=${local.systems.vercelInspect}`);
  console.log(`OPENAI_LIVE=${local.systems.openaiLive}`);
  console.log(`STRIPE_SANDBOX=${local.systems.stripeSandboxRead}`);
  console.log(`SECRET_EXPOSURE=${secretExposure}`);
  console.log(`STRIPE_MUTATED=${local.stripeMutated}`);
  console.log(`PRODUCTION_MUTATED=${local.productionMutated}`);
  console.log(`AUTH_LAYER_CLOSED=${String(authMissing && authNoHeader)}`);
  console.log(`PRODUCTION_HEARTBEAT_HTTP=${hostedHttp === null ? "NOT_PROBED" : String(hostedHttp)}`);
  console.log(`CATALOG_DURABLE=${String(local.workState.catalogDurable)}`);
  console.log(`RUNTIME_RECORDS_DURABLE=${String(local.workState.runtimeRecordsDurable)}`);
  console.log(`RETRIES=${String(local.retries)}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message.replace(/sk_(live|test)_[A-Za-z0-9]+/g, "[redacted]").replace(/vcp_[A-Za-z0-9]+/g, "[redacted]"));
  process.exit(1);
});
