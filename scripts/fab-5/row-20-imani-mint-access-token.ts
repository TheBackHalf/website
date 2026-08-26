/**
 * Attempt official project-scoped access-token mint. Never prints the token.
 * If mint succeeds, tests read-only project endpoints and writes VERCEL_TOKEN
 * to .env.local only.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const PROJECT_ID = "prj_FCi9UmpaTJVGQwlHeREMqDEfJsOy";

function redact(value: string): string {
  return value
    .replace(/vcp_[A-Za-z0-9]+/g, "[redacted-vercel-token]")
    .replace(/vercel_[A-Za-z0-9]+/g, "[redacted-vercel-token]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+/g, "[redacted-jwt]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

function cli(args: string[]): { status: number | null; text: string } {
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    SYSTEMROOT: process.env.SYSTEMROOT,
    WINDIR: process.env.WINDIR,
    ComSpec: process.env.ComSpec,
    PATHEXT: process.env.PATHEXT,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    APPDATA: process.env.APPDATA,
    LOCALAPPDATA: process.env.LOCALAPPDATA,
    USERPROFILE: process.env.USERPROFILE,
    HOME: process.env.HOME,
    npm_config_cache: process.env.npm_config_cache,
  };
  delete env.VERCEL_TOKEN;
  const result = spawnSync("npx", ["--yes", "vercel", ...args], {
    encoding: "utf8",
    shell: true,
    timeout: 90000,
    env,
    cwd: process.cwd(),
  });
  return { status: result.status, text: `${result.stdout ?? ""}\n${result.stderr ?? ""}` };
}

function extractToken(text: string): string | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  if (start >= 0) {
    try {
      const parsed = JSON.parse(trimmed.slice(start)) as Record<string, unknown>;
      for (const key of ["token", "bearerToken", "value", "accessToken", "idToken"]) {
        const value = parsed[key];
        if (typeof value === "string" && value.length > 20) return value.trim();
      }
    } catch {
      // fall through
    }
  }
  const vcp = trimmed.match(/vcp_[A-Za-z0-9]+/);
  if (vcp?.[0]) return vcp[0];
  return null;
}

function upsertEnvLocal(name: string, value: string): void {
  const filePath = path.join(process.cwd(), ".env.local");
  const current = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  const lines = current.split(/\r?\n/);
  let replaced = false;
  const next = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) return line;
    const key = trimmed.slice(0, eq).trim().replace(/^export\s+/, "");
    if (key !== name) return line;
    replaced = true;
    return `${name}=${value}`;
  });
  if (!replaced) {
    if (next.length > 0 && next[next.length - 1] !== "") next.push("");
    next.push(`# Imani Heartbeat Vercel machine access (Row 20). Never commit.`);
    next.push(`${name}=${value}`);
    next.push("");
  }
  writeFileSync(filePath, next.join("\n"), "utf8");
}

async function probe(token: string): Promise<Array<{ path: string; status: number }>> {
  const url = new URL(`https://api.vercel.com/v9/projects/${PROJECT_ID}`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  return [{ path: `/v9/projects/${PROJECT_ID}`, status: res.status }];
}

async function main(): Promise<void> {
  const minted = cli([
    "tokens",
    "add",
    "ImaniHeartbeat-website",
    "--project",
    PROJECT_ID,
    "--format",
    "json",
    "--non-interactive",
  ]);
  const token = extractToken(minted.text);
  const probes = token ? await probe(token) : [];
  const stored = Boolean(token && probes[0]?.status === 200);
  if (stored && token) upsertEnvLocal("VERCEL_TOKEN", token);
  console.log(
    JSON.stringify(
      {
        mintExit: minted.status,
        tokenPresent: Boolean(token),
        tokenPrefixClass: token ? (token.startsWith("vcp_") ? "vercel_project_token_prefix" : "other_nonempty") : "absent",
        probes,
        storedInEnvLocal: stored,
        mintError: token ? null : redact(minted.text).slice(0, 500),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
