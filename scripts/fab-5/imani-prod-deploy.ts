/**
 * Production-deploy Imani heartbeat on back-half/website.
 * Never prints tokens. Does not change Vercel env.
 */
import { spawnSync } from "node:child_process";
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

function redact(value: string): string {
  return value
    .replace(/vcp_[A-Za-z0-9]+/g, "[redacted-vercel]")
    .replace(/vercel_[A-Za-z0-9]+/g, "[redacted-vercel]")
    .replace(/sk_(live|test)_[A-Za-z0-9]+/g, "[redacted-stripe]")
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted-openai]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

async function main(): Promise<void> {
  const token = readEnvLocalName("VERCEL_TOKEN");
  if (!token) {
    console.log("DEPLOY=FAIL");
    console.log("REASON=VERCEL_TOKEN_MISSING_LOCAL");
    process.exit(1);
  }
  const result = spawnSync(
    "npx --yes vercel deploy --prod --yes --scope back-half",
    {
      cwd: process.cwd(),
      env: { ...process.env, VERCEL_TOKEN: token, VERCEL_ORG_ID: "team_78QcHJQpS3JFQLL0nRZTUY8e" },
      encoding: "utf8",
      timeout: 15 * 60 * 1000,
      shell: true,
    },
  );
  const spawnErr = result.error ? redact(result.error.message) : null;
  const stdout = redact(result.stdout || "");
  const stderr = redact(result.stderr || "");
  const combined = `${stdout}\n${stderr}`;
  const urlMatch = combined.match(/https:\/\/[a-z0-9.-]+\.vercel\.app[^\s]*/i);
  const inspectUrl = urlMatch?.[0]?.replace(/\/$/, "") ?? null;
  const ok = result.status === 0;
  const evidence = {
    at: new Date().toISOString(),
    command: "vercel deploy --prod --yes --scope back-half",
    exit: result.status,
    ok,
    deploymentUrlPresent: Boolean(inspectUrl),
    spawnError: spawnErr,
    notes: combined
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) =>
        /production|inspect|https:\/\/|error|ready|cron|build/i.test(line),
      )
      .slice(-40),
  };
  await writeFile(
    path.join(process.cwd(), "ops", "fab-5", "runs", "imani-heartbeat-prod-deploy.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  console.log(`DEPLOY=${ok ? "PASS" : "FAIL"}`);
  console.log(`SIGNAL=${result.signal ?? "none"}`);
  console.log(`SPAWN_ERROR=${spawnErr ? "YES" : "NO"}`);
  if (spawnErr) console.log(`SPAWN_ERROR_KIND=${spawnErr.includes("ENOENT") ? "ENOENT" : spawnErr.includes("ETIMEDOUT") ? "TIMEOUT" : "OTHER"}`);
  if (!ok) process.exit(1);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(redact(message));
  process.exit(1);
});
