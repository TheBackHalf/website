/**
 * Hosted Michelle cycle validation against Production. Never prints secrets.
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
  return /sk_live_|sk_test_|rk_live_|rk_test_|sk-[A-Za-z0-9_-]{8,}|vcp_[A-Za-z0-9]+|whsec_|CRON_SECRET=/.test(value);
}

async function main(): Promise<void> {
  const host = "website-two-psi-49.vercel.app";
  const url = `https://${host}/api/fab-5/michelle/cycle`;
  const unauth = await fetch(url, { method: "GET" });
  const unauthText = await unauth.text();
  const unauthHtml = /<html/i.test(unauthText);
  const secret = readEnvLocalName("CRON_SECRET");
  if (!secret) {
    console.log("CRON_SECRET_LOCAL=MISSING");
    process.exit(1);
  }
  const auth = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      trigger: "queue",
      acceptancePack: true,
      founderUnavailable: true,
      task: "Hosted Michelle unattended cycle and acceptance pack. Do not change the launch date.",
    }),
  });
  const body = await auth.text();
  const leaked = leak(body);
  const parsed = body.trim().startsWith("{") ? (JSON.parse(body) as Record<string, unknown>) : null;
  const evidence = {
    at: new Date().toISOString(),
    host,
    unauthStatus: unauth.status,
    unauthHtml,
    authStatus: auth.status,
    runId: parsed?.runId ?? null,
    hosted: parsed?.hosted ?? null,
    vercelEnv: parsed?.vercelEnv ?? null,
    outcome: parsed?.outcome ?? null,
    openaiLive: parsed?.openaiLive ?? null,
    imaniDelegation: parsed?.imaniDelegation ?? null,
    persist: parsed?.persist ?? null,
    nia: parsed?.nia ?? null,
    acceptancePack: parsed?.acceptancePack ?? null,
    secretExposure: leaked ? "YES" : "NO",
  };
  const out = path.join("ops", "fab-5", "runs", "michelle-hosted-validation.json");
  await writeFile(out, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`UNAUTH_STATUS=${unauth.status}`);
  console.log(`UNAUTH_HTML=${String(unauthHtml)}`);
  console.log(`AUTH_STATUS=${auth.status}`);
  console.log(`HOSTED=${String(parsed?.hosted)}`);
  console.log(`VERCEL_ENV=${String(parsed?.vercelEnv)}`);
  console.log(`OUTCOME=${String(parsed?.outcome)}`);
  console.log(`RUN_ID=${String(parsed?.runId)}`);
  console.log(`OPENAI=${String(parsed?.openaiLive)}`);
  console.log(`SECRET_EXPOSURE=${leaked ? "YES" : "NO"}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message.replace(/sk_(live|test)_[A-Za-z0-9]+/g, "[redacted]"));
  process.exit(1);
});
