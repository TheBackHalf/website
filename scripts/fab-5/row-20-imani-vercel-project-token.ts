/**
 * Obtain and test a Vercel project machine credential without printing secrets.
 * Read-only against back-half/website. Does not mutate production.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function redact(value: string): string {
  return value
    .replace(/vcp_[A-Za-z0-9]+/g, "[redacted-vercel-token]")
    .replace(/vercel_[A-Za-z0-9]+/g, "[redacted-vercel-token]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+/g, "[redacted-jwt]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

function classifyPrefix(value: string): string {
  if (value.startsWith("vcp_")) return "vercel_project_token_prefix";
  if (value.startsWith("vercel_")) return "vercel_access_token_prefix";
  if (value.startsWith("eyJ")) return "jwt_oidc_prefix";
  return "other_nonempty";
}

function loadLinked(): { id: string; name: string; orgId: string } | null {
  const filePath = path.join(process.cwd(), ".vercel", "repo.json");
  if (!existsSync(filePath)) return null;
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
    projects?: Array<{ id?: string; name?: string; orgId?: string }>;
  };
  const project = parsed.projects?.[0];
  if (!project?.id || !project.name || !project.orgId) return null;
  return { id: project.id, name: project.name, orgId: project.orgId };
}

function cli(args: string[], extraEnv: NodeJS.ProcessEnv = {}): { status: number | null; text: string } {
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
    ...extraEnv,
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
      for (const key of ["token", "idToken", "id_token", "oidcToken", "oidc_token", "accessToken", "value"]) {
        const value = parsed[key];
        if (typeof value === "string" && value.length > 20) return value.trim();
      }
    } catch {
      // fall through
    }
  }
  const jwt = trimmed.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+/);
  if (jwt?.[0]) return jwt[0];
  const vcp = trimmed.match(/vcp_[A-Za-z0-9]+/);
  if (vcp?.[0]) return vcp[0];
  const line = trimmed
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.length > 24 && !/\s/.test(item) && !/error|warn|npm /i.test(item));
  return line ?? null;
}

async function probe(token: string, linked: { id: string; name: string; orgId: string }): Promise<Array<{ path: string; status: number; code: string | null }>> {
  const paths: Array<{ path: string; query?: Record<string, string> }> = [
    { path: `/v9/projects/${encodeURIComponent(linked.id)}` },
    { path: `/v9/projects/${encodeURIComponent(linked.name)}`, query: { teamId: linked.orgId } },
    { path: "/v6/deployments", query: { projectId: linked.id, limit: "5", target: "production" } },
    { path: "/v4/aliases", query: { projectId: linked.id, limit: "10" } },
    { path: `/v9/projects/${encodeURIComponent(linked.id)}/env` },
    { path: `/v9/projects/${encodeURIComponent(linked.id)}/domains` },
  ];
  const out: Array<{ path: string; status: number; code: string | null }> = [];
  for (const item of paths) {
    const url = new URL(`https://api.vercel.com${item.path}`);
    for (const [key, value] of Object.entries(item.query ?? {})) url.searchParams.set(key, value);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    let code: string | null = null;
    try {
      const json = (await res.json()) as { error?: { code?: string } };
      code = typeof json.error?.code === "string" ? json.error.code : null;
    } catch {
      code = null;
    }
    out.push({ path: item.path, status: res.status, code });
  }
  return out;
}

async function main(): Promise<void> {
  const linked = loadLinked();
  const version = cli(["--version"]);
  const help = cli(["project", "token", "--help"]);
  const inspect = cli(["project", "inspect", "website", "--non-interactive"]);
  const minted = cli(["project", "token", "website", "--yes", "--format", "json", "--non-interactive"]);
  const token = extractToken(minted.text);
  const probes = token && linked ? await probe(token, linked) : [];
  console.log(
    JSON.stringify(
      {
        cliVersion: redact(version.text).trim().split(/\r?\n/).filter(Boolean).slice(-2),
        linked: linked ? { name: linked.name, idPresent: Boolean(linked.id), orgPresent: Boolean(linked.orgId) } : null,
        projectTokenHelpOk: help.status === 0,
        projectTokenHelpHasOidc: /oidc/i.test(help.text),
        projectInspectExit: inspect.status,
        projectInspectHasWebsite: /website/i.test(inspect.text),
        mintExit: minted.status,
        tokenPresent: Boolean(token),
        tokenPrefixClass: token ? classifyPrefix(token) : "absent",
        mintError: minted.status === 0 ? null : redact(minted.text).slice(0, 400),
        probes,
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
