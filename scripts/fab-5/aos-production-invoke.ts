/**
 * Invoke hosted AOS validation using production env. Never prints secrets.
 * Uses `vercel curl` so Deployment Protection does not block the gate.
 */
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

function deploymentUrl(): string {
  const arg = process.argv.find((value) => value.startsWith("https://"));
  if (arg) return arg.replace(/\/$/, "");
  const env = process.env.AOS_DEPLOYMENT_URL?.trim();
  if (env) return env.startsWith("http") ? env.replace(/\/$/, "") : `https://${env}`;
  return "https://website-lavzs5dr7-back-half.vercel.app";
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return { error: "non_json" };
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return { error: "json_parse_failed" };
  }
}

function call(pathname: string, init?: RequestInit): { status: number; body: unknown } {
  const secret = process.env.CRON_SECRET?.trim() || process.env.IMANI_HEARTBEAT_SECRET?.trim();
  if (!secret) {
    return { status: 503, body: { error: "missing_cron_secret" } };
  }
  const args = [
    "vercel",
    "curl",
    pathname,
    "--deployment",
    deploymentUrl(),
    "--yes",
    "-sS",
    "--max-time",
    "300",
    "-o",
    "-",
    "-w",
    "\nAOS_HTTP:%{http_code}",
    "-H",
    `Authorization: Bearer ${secret}`,
    "-H",
    "Content-Type: application/json",
  ];
  if ((init?.method ?? "GET").toUpperCase() === "POST") {
    args.push("-X", "POST", "--data-binary", typeof init?.body === "string" ? init.body : "{}");
  }
  const result = spawnSync("npx", args, {
    encoding: "utf8",
    timeout: 320000,
    shell: true,
  });
  const stdout = `${result.stdout ?? ""}`;
  const statusMatch = stdout.match(/AOS_HTTP:(\d{3})/);
  const status = statusMatch ? Number(statusMatch[1]) : result.status === 0 ? 200 : 500;
  const body = extractJson(stdout.replace(/\nAOS_HTTP:\d{3}\s*$/, ""));
  if (!statusMatch && result.status !== 0) {
    return { status: 500, body: { error: "vercel_curl_failed" } };
  }
  return { status, body };
}

async function main(): Promise<void> {
  const phase = process.argv.includes("ingest") ? "ingest" : "gate";
  const health = call("/api/fab-5/aos/validate");
  const action =
    phase === "ingest"
      ? call("/api/fab-5/aos/validate", { method: "POST", body: JSON.stringify({ ingest: true }) })
      : call("/api/fab-5/aos/validate", { method: "POST", body: JSON.stringify({}) });
  const tick = call("/api/fab-5/aos/tick");
  const report = {
    at: new Date().toISOString(),
    deploymentHostSet: Boolean(deploymentUrl()),
    healthStatus: health.status,
    healthOk: health.status === 200,
    actionStatus: action.status,
    tickStatus: tick.status,
    health: health.body,
    action: action.body,
    tick: tick.body,
  };
  const out = path.join("ops", "fab-5", "runs", "aos-production-validation.json");
  await writeFile(out, JSON.stringify(report, null, 2), "utf8");
  console.log(
    `AOS_PRODUCTION health=${health.status} action=${action.status} tick=${tick.status} phase=${phase}`,
  );
  if (health.status !== 200 || action.status !== 200) process.exit(1);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "aos_production_invoke_failed";
  console.error(/secret|postgres|Bearer/i.test(message) ? "aos_production_invoke_failed" : message);
  process.exit(1);
});
