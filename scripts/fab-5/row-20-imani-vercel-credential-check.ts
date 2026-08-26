/**
 * Read-only diagnostic of the existing VERCEL_TOKEN.
 * Never prints token values, env values, or authorization headers.
 * Does not create, revoke, rotate, or overwrite credentials.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function redact(value: string): string {
  return value
    .replace(/vcp_[A-Za-z0-9]+/g, "[redacted-vercel-token]")
    .replace(/vercel_[A-Za-z0-9]+/g, "[redacted-vercel-token]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+/g, "[redacted-jwt]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/sk_(live|test)_[A-Za-z0-9]+/g, "[redacted-stripe]");
}

function normalizeSecret(value: string): string {
  let next = value.trim().replace(/^\uFEFF/, "");
  if (
    (next.startsWith('"') && next.endsWith('"')) ||
    (next.startsWith("'") && next.endsWith("'"))
  ) {
    next = next.slice(1, -1).trim();
  }
  if (/^bearer\s+/i.test(next)) next = next.replace(/^bearer\s+/i, "").trim();
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
    let key = line.slice(0, eq).trim().replace(/^\uFEFF/, "");
    if (key.startsWith("export ")) key = key.slice(7).trim();
    if (key !== name) continue;
    const value = normalizeSecret(line.slice(eq + 1));
    return value.length > 0 ? value : undefined;
  }
  return undefined;
}

function errorCode(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const err = (json as { error?: { code?: unknown; message?: unknown } }).error;
  if (!err || typeof err !== "object") return null;
  const code = typeof err.code === "string" ? err.code : null;
  const message = typeof err.message === "string" ? redact(err.message) : null;
  return [code, message].filter(Boolean).join(": ") || null;
}

async function get(
  token: string,
  pathname: string,
  query: Record<string, string> = {},
): Promise<{ status: number; code: string | null; json: unknown }> {
  const url = new URL(`https://api.vercel.com${pathname}`);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, code: errorCode(json), json };
}

function tokenNameFrom(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const rec = json as { token?: { name?: unknown }; name?: unknown };
  if (typeof rec.token?.name === "string") return rec.token.name;
  if (typeof rec.name === "string") return rec.name;
  return null;
}

async function main(): Promise<void> {
  const token = readEnvLocalName("VERCEL_TOKEN");
  const linkedRaw = existsSync(path.join(process.cwd(), ".vercel", "repo.json"))
    ? (JSON.parse(readFileSync(path.join(process.cwd(), ".vercel", "repo.json"), "utf8")) as {
        projects?: Array<{ id?: string; name?: string; orgId?: string }>;
      })
    : null;
  const linked = linkedRaw?.projects?.[0];
  const projectId = linked?.id ?? "";
  const projectName = linked?.name ?? "website";
  const teamId = linked?.orgId ?? "";

  if (!token) {
    console.log("IMANI VERCEL CREDENTIAL VALIDATION");
    console.log("VERCEL_TOKEN:\nMISSING");
    console.log("TOKEN MATCH TO IMANI-WEBSITE-PRODUCTION:\nCANNOT DETERMINE");
    console.log("PROJECT READ:\nFAIL");
    console.log("DEPLOYMENT METADATA READ:\nFAIL");
    console.log("ALIASES / DOMAINS READ:\nFAIL");
    console.log("ENV METADATA READ:\nFAIL");
    console.log("ROLLBACK TARGET READ:\nFAIL");
    console.log("AUTHENTICATION ERROR:\nVERCEL_TOKEN missing from .env.local");
    console.log("SECRET EXPOSURE:\nNO");
    console.log("PRODUCTION MUTATED:\nNO");
    console.log("ROOT CAUSE:\nNo VERCEL_TOKEN is configured in local/server env.");
    console.log("NEXT REQUIRED ACTION:\nPlace the Imani-Website-Production token value into local/server env as VERCEL_TOKEN without pasting it into chat.");
    return;
  }

  const suffix = token.slice(-4);
  const prefix = token.startsWith("vcp_") ? "vcp_" : token.startsWith("vercel_") ? "vercel_" : "other";
  const fingerprint = createHash("sha256").update(token).digest("hex").slice(0, 8);

  const current = await get(token, "/v5/user/tokens/current");
  const currentAlt = current.status === 200 ? current : await get(token, "/v3/user/tokens");
  const reportedName = tokenNameFrom(current.json) ?? tokenNameFrom(currentAlt.json);
  const match =
    reportedName === "Imani-Website-Production"
      ? "CONFIRMED"
      : reportedName
        ? "NOT CONFIRMED"
        : "CANNOT DETERMINE";

  const projectDirect = await get(token, `/v9/projects/${encodeURIComponent(projectId)}`);
  const projectTeam = await get(token, `/v9/projects/${encodeURIComponent(projectId)}`, { teamId });
  const projectNameTeam = await get(token, `/v9/projects/${encodeURIComponent(projectName)}`, { teamId });
  const projectOk =
    projectDirect.status === 200 || projectTeam.status === 200 || projectNameTeam.status === 200;

  const deployments = await get(token, "/v6/deployments", {
    projectId,
    limit: "8",
    target: "production",
  });
  const deploymentsTeam = deployments.status === 200
    ? deployments
    : await get(token, "/v6/deployments", { projectId, limit: "8", target: "production", teamId });
  const deploymentList =
    deploymentsTeam.status === 200 && deploymentsTeam.json && typeof deploymentsTeam.json === "object"
      ? (((deploymentsTeam.json as { deployments?: unknown[] }).deployments ?? []) as Array<Record<string, unknown>>)
      : [];
  const deploymentsOk = deploymentsTeam.status === 200;

  const aliases = await get(token, "/v4/aliases", { projectId, limit: "20" });
  const aliasesTeam = aliases.status === 200 ? aliases : await get(token, "/v4/aliases", { projectId, limit: "20", teamId });
  const domains = await get(token, `/v9/projects/${encodeURIComponent(projectId)}/domains`);
  const domainsTeam =
    domains.status === 200
      ? domains
      : await get(token, `/v9/projects/${encodeURIComponent(projectId)}/domains`, { teamId });
  const aliasesOk = aliasesTeam.status === 200 || domainsTeam.status === 200;

  const env = await get(token, `/v9/projects/${encodeURIComponent(projectId)}/env`);
  const envTeam =
    env.status === 200
      ? env
      : await get(token, `/v9/projects/${encodeURIComponent(projectId)}/env`, { teamId });
  const envOk = envTeam.status === 200;

  const ready = deploymentList.filter((item) => item.readyState === "READY" || item.state === "READY");
  const rollbackOk = deploymentsOk && (ready.length > 0 || deploymentList.length > 0);

  const failures = [
    ["GET /v9/projects/:id", projectDirect],
    ["GET /v9/projects/:id?teamId", projectTeam],
    ["GET /v9/projects/website?teamId", projectNameTeam],
    ["GET /v6/deployments?projectId&target=production", deploymentsTeam],
    ["GET /v4/aliases?projectId", aliasesTeam],
    ["GET /v9/projects/:id/domains", domainsTeam],
    ["GET /v9/projects/:id/env", envTeam],
  ]
    .filter(([, result]) => (result as { status: number }).status >= 400)
    .map(([op, result]) => {
      const r = result as { status: number; code: string | null };
      return `${op} HTTP ${r.status}${r.code ? ` ${r.code}` : ""}`;
    });

  const authError = failures.length > 0 ? failures.join("; ") : "NONE";

  let root: string;
  if (projectOk && deploymentsOk) {
    root =
      match === "CONFIRMED"
        ? "Existing VERCEL_TOKEN authenticates to back-half/website and metadata names it Imani-Website-Production."
        : `Existing VERCEL_TOKEN authenticates to back-half/website; dashboard name match ${match.toLowerCase()} (suffix ${suffix}, sha256 ${fingerprint}, prefix ${prefix}).`;
  } else if (failures.some((item) => item.includes("403"))) {
    root = `Existing VERCEL_TOKEN is PRESENT (prefix ${prefix}, suffix ${suffix}) but Vercel returns 403 forbidden for back-half/website REST reads; token-name endpoint ${current.status}/${current.code ?? "no-code"} so match to Imani-Website-Production is ${match}.`;
  } else if (failures.some((item) => item.includes("401"))) {
    root = `Existing VERCEL_TOKEN is PRESENT (prefix ${prefix}, suffix ${suffix}) but Vercel returns 401 unauthorized; it is not a valid API credential for this request.`;
  } else {
    root = `Existing VERCEL_TOKEN is PRESENT (prefix ${prefix}, suffix ${suffix}) but project reads did not succeed.`;
  }

  const next =
    projectOk
      ? "None for this Vercel credential check; Imani may use the existing VERCEL_TOKEN."
      : "In local/server env only, set VERCEL_TOKEN to the Imani-Website-Production token value from the Vercel Account Tokens dashboard (copy once there). Do not paste it into chat. Do not create another token.";

  console.log("IMANI VERCEL CREDENTIAL VALIDATION");
  console.log(`VERCEL_TOKEN:\nPRESENT`);
  console.log(`TOKEN MATCH TO IMANI-WEBSITE-PRODUCTION:\n${match}`);
  console.log(`PROJECT READ:\n${projectOk ? "PASS" : "FAIL"}`);
  console.log(`DEPLOYMENT METADATA READ:\n${deploymentsOk ? "PASS" : "FAIL"}`);
  console.log(`ALIASES / DOMAINS READ:\n${aliasesOk ? "PASS" : "FAIL"}`);
  console.log(`ENV METADATA READ:\n${envOk ? "PASS" : "FAIL"}`);
  console.log(`ROLLBACK TARGET READ:\n${rollbackOk ? "PASS" : "FAIL"}`);
  console.log(`AUTHENTICATION ERROR:\n${authError}`);
  console.log("SECRET EXPOSURE:\nNO");
  console.log("PRODUCTION MUTATED:\nNO");
  console.log(`ROOT CAUSE:\n${root}`);
  console.log(`NEXT REQUIRED ACTION:\n${next}`);
}

main().catch((error) => {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
