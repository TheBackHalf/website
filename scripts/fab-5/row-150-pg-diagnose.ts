/**
 * Reports Postgres/analytics backend status without printing secrets.
 */
import { existsSync, readFileSync } from "node:fs";
import { analyticsPostgresConfigured } from "@/lib/analytics/db";
import {
  getAnalyticsDurability,
  resetAnalyticsStoreForTests,
} from "@/lib/analytics/store";
import { loadPostgresEnvFromLocalFile } from "@/lib/marketing-kpi/db";
import { resetMichelleSqlForTests } from "@/lib/fab-5/michelle-db";

const PROJECT_ID = "prj_FCi9UmpaTJVGQwlHeREMqDEfJsOy";
const TEAM_ID = "team_78QcHJQpS3JFQLL0nRZTUY8e";
const POSTGRES_KEYS = new Set([
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
]);

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
  if (!existsSync(".env.local")) return undefined;
  for (const rawLine of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
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

function hostHint(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.replace(/^postgres(?:ql)?:/i, "https:"));
    return url.hostname.slice(0, 80);
  } catch {
    const match = value.match(/@([^/:\s]+)/);
    return match?.[1]?.slice(0, 80) ?? "unparsed_host";
  }
}

function snapshot() {
  loadPostgresEnvFromLocalFile();
  resetMichelleSqlForTests();
  resetAnalyticsStoreForTests();
  const durability = getAnalyticsDurability();
  return {
    configured: analyticsPostgresConfigured(),
    backend: durability.backend,
    productionSourceOfTruth: durability.productionSourceOfTruth,
    dataDirIsSourceOfTruth: durability.dataDirIsSourceOfTruth,
    keysPresent: {
      POSTGRES_URL: Boolean(process.env.POSTGRES_URL?.trim()),
      POSTGRES_URL_NON_POOLING: Boolean(process.env.POSTGRES_URL_NON_POOLING?.trim()),
      DATABASE_URL: Boolean(process.env.DATABASE_URL?.trim()),
      POSTGRES_PRISMA_URL: Boolean(process.env.POSTGRES_PRISMA_URL?.trim()),
    },
    hostHint:
      hostHint(process.env.POSTGRES_URL_NON_POOLING) ||
      hostHint(process.env.POSTGRES_URL) ||
      hostHint(process.env.DATABASE_URL) ||
      hostHint(process.env.POSTGRES_PRISMA_URL),
  };
}

async function vercelJson(
  token: string,
  url: string,
): Promise<{ status: number; body: Record<string, unknown> | unknown[] | null }> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  }).catch(() => null);
  if (!res) return { status: 0, body: null };
  let body: Record<string, unknown> | unknown[] | null = null;
  try {
    body = (await res.json()) as Record<string, unknown> | unknown[];
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function main() {
  const local = snapshot();
  const token = readEnvLocalName("VERCEL_TOKEN");
  const report: Record<string, unknown> = {
    local,
    vercelTokenPresent: Boolean(token),
    vercelTokenLen: token?.length ?? 0,
  };

  if (!token) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const envList = await vercelJson(
    token,
    `https://api.vercel.com/v9/projects/${PROJECT_ID}/env?decrypt=true&teamId=${TEAM_ID}`,
  );
  const rows = Array.isArray(envList.body)
    ? envList.body
    : Array.isArray((envList.body as { envs?: unknown[] } | null)?.envs)
      ? ((envList.body as { envs: unknown[] }).envs)
      : [];
  const postgresRows = rows
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .filter((item) => typeof item.key === "string" && POSTGRES_KEYS.has(item.key));

  const envDetails = [];
  for (const item of postgresRows) {
    const key = String(item.key);
    const id = typeof item.id === "string" ? item.id : "";
    const listValueLen =
      typeof item.value === "string" ? item.value.length : 0;
    let oneStatus: number | null = null;
    let oneValueLen = 0;
    let oneError: string | null = null;
    if (id) {
      const one = await vercelJson(
        token,
        `https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${encodeURIComponent(id)}?decrypt=true&teamId=${TEAM_ID}`,
      );
      oneStatus = one.status;
      const oneBody = one.body && !Array.isArray(one.body) ? one.body : null;
      if (typeof oneBody?.value === "string") {
        oneValueLen = oneBody.value.length;
        if (oneValueLen > 0 && !process.env[key]) process.env[key] = oneBody.value;
      } else if (oneBody && typeof oneBody.error === "object" && oneBody.error) {
        const err = oneBody.error as { code?: string; message?: string };
        oneError = `${err.code ?? "error"}:${(err.message ?? "").slice(0, 80)}`;
      } else if (typeof oneBody?.error === "string") {
        oneError = oneBody.error.slice(0, 80);
      }
    }
    if (listValueLen > 0 && !process.env[key]) process.env[key] = String(item.value);
    envDetails.push({
      key,
      type: item.type ?? null,
      target: item.target ?? null,
      sensitive: item.sensitive ?? null,
      listValueLen,
      oneStatus,
      oneValueLen,
      oneError,
    });
  }

  if (!process.env.POSTGRES_URL?.trim()) {
    const fallback =
      process.env.POSTGRES_URL_NON_POOLING?.trim() ||
      process.env.DATABASE_URL?.trim() ||
      process.env.POSTGRES_PRISMA_URL?.trim();
    if (fallback) process.env.POSTGRES_URL = fallback;
  }
  resetMichelleSqlForTests();
  resetAnalyticsStoreForTests();

  const storage = await vercelJson(
    token,
    `https://api.vercel.com/v1/storage?teamId=${TEAM_ID}&projectId=${PROJECT_ID}`,
  );
  const postgresStores = await vercelJson(
    token,
    `https://api.vercel.com/v1/postgres?teamId=${TEAM_ID}`,
  );

  function summarizeStores(body: Record<string, unknown> | unknown[] | null) {
    const list = Array.isArray(body)
      ? body
      : Array.isArray((body as { stores?: unknown[] } | null)?.stores)
        ? ((body as { stores: unknown[] }).stores)
        : Array.isArray((body as { stores?: { records?: unknown[] } } | null)?.stores?.records)
          ? (((body as { stores: { records: unknown[] } }).stores.records))
          : [];
    return list.slice(0, 12).map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        name: typeof row.name === "string" ? row.name : null,
        type: typeof row.type === "string" ? row.type : row.kind ?? null,
        status: row.status ?? null,
        hasConnectionString: Boolean(
          row.connectionString ||
            (row.env && typeof row.env === "object"),
        ),
      };
    });
  }

  report.vercelEnvListStatus = envList.status;
  report.postgresEnvVars = envDetails;
  report.afterVercelApi = snapshot();
  report.storageStatus = storage.status;
  report.storageError =
    storage.body && !Array.isArray(storage.body)
      ? ((storage.body.error as { code?: string; message?: string } | string | undefined) ?? null)
      : null;
  report.storageStores = summarizeStores(storage.body);
  report.postgresApiStatus = postgresStores.status;
  report.postgresApiError =
    postgresStores.body && !Array.isArray(postgresStores.body)
      ? ((postgresStores.body.error as { code?: string; message?: string } | string | undefined) ??
        null)
      : null;
  report.postgresStores = summarizeStores(postgresStores.body);

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    message
      .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@")
      .replace(/eyJ[A-Za-z0-9_-]{20,}/g, "[redacted]"),
  );
  process.exit(1);
});
