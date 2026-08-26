/**
 * Row 73 launch-critical vendor capacity and billing evidence.
 * Uses the Row 72 register as the vendor inventory. Does not create a second register.
 * Never prints secret values. Does not charge, refund, payout, send mail, or change DNS.
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  isAdminOpsPath,
  isSupportTicketAdminPath,
} from "@/lib/auth/ops-paths";
import { roleHasPermission } from "@/lib/auth/permissions";
import {
  loadServerEnvAllowlist,
  verifyOpenAiLive,
  verifyStripeReporting,
} from "@/lib/fab-5/access";
import { loadRow72Register, ROW72_REGISTER_PATH } from "@/lib/fab-5/row72-register";
import { imaniVercelInspect } from "@/lib/fab-5/vercel";
import { getLaunchDashboardSql, launchDashboardPostgresConfigured } from "@/lib/launch-dashboard/db";
import { loadPostgresEnvFromLocalFile } from "@/lib/marketing-kpi/db";

export const ROW73_REVIEW_PATH = "/_internal/row73-vendor-capacity-billing-review";
export const ROW73_REVIEW_URL = `http://localhost:3000${ROW73_REVIEW_PATH}`;
export const ROW73_STATUS_PATH = "ops/fab-5/row-73-status.json";
export const ROW73_VALIDATION_PATH = "ops/fab-5/runs/row-73-vendor-capacity-billing-validation.json";
/** Stable production alias (still attached to the current Production deployment). */
export const PRODUCTION_HOST = "https://website-two-psi-49.vercel.app";
export const CANONICAL_HOST = "https://thebackhalf.org";
/** Current unique Production URL observed 2026-08-25 after Stripe live-connect deploy. */
export const CURRENT_PRODUCTION_DEPLOYMENT_URL =
  "https://website-8btgaomba-back-half.vercel.app";
export const CURRENT_PRODUCTION_DEPLOYMENT_ID = "dpl_FtuhBQ54o6kPBdaV7KDEGTjgGzak";

const SECRET_PATTERN =
  /sk_live_|sk_test_|rk_live_|rk_test_|whsec_|postgres(?:ql)?:\/\/[^@\s]+@|CRON_SECRET=|AUTH_SECRET=|sk-proj-|sk-[A-Za-z0-9]{16,}|AIza[A-Za-z0-9]{20,}/i;

export function row73TextContainsSecrets(text: string): boolean {
  return SECRET_PATTERN.test(text);
}

const REQUIRED_VERCEL_ENV_NAMES = [
  "AUTH_SECRET",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_BLUEPRINT",
  "STRIPE_PRICE_BUNDLE",
  "STRIPE_PRICE_COMMUNITY",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
  "OPENAI_API_KEY",
  "CRON_SECRET",
  "CURSOR_API_KEY",
] as const;

const EXTRA_ENV_LOAD_NAMES = ["OPENAI_API_KEY", "STRIPE_WEBHOOK_SECRET"] as const;

export type ServiceStatus = "OPERATIONAL" | "DEGRADED" | "INCIDENT" | "UNABLE TO VERIFY";

export type StatusPageResult = {
  vendorId: string;
  url: string;
  httpStatus: number;
  serviceStatus: ServiceStatus;
  indicator: string | null;
  incidentName: string | null;
};

function countMp4(dir: string): number {
  if (!existsSync(dir)) return 0;
  let count = 0;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) count += countMp4(full);
    else if (entry.toLowerCase().endsWith(".mp4")) count += 1;
  }
  return count;
}

function loadLocalEnvNamesOnly(): string[] {
  const present: string[] = [];
  const filePath = path.join(process.cwd(), ".env.local");
  if (!existsSync(filePath)) return present;
  for (const raw of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let key = line.slice(0, eq).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    const value = line.slice(eq + 1).trim().replace(/^\uFEFF/, "");
    const unquoted =
      (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
        ? value.slice(1, -1).trim()
        : value;
    if (unquoted.length > 0) present.push(key);
  }
  return present;
}

function loadNamedEnvIntoProcess(names: readonly string[]): void {
  const filePath = path.join(process.cwd(), ".env.local");
  if (!existsSync(filePath)) return;
  for (const raw of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let key = line.slice(0, eq).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    if (!names.includes(key)) continue;
    if (process.env[key]?.trim()) continue;
    let value = line.slice(eq + 1).trim().replace(/^\uFEFF/, "");
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).trim();
    }
    if (value.length > 0) process.env[key] = value;
  }
}

function classifyStripeKey(value: string | undefined): "live" | "test" | "other" | "absent" {
  if (!value?.trim()) return "absent";
  if (value.startsWith("sk_live_")) return "live";
  if (value.startsWith("sk_test_")) return "test";
  return "other";
}

function loadProductionStripeKeyClass(): "live" | "test" | "unknown" {
  const filePath = path.join(process.cwd(), "ops/fab-5/runs/row-73-stripe-key-class.json");
  if (!existsSync(filePath)) return "unknown";
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
      vercelProductionStripeKeyClass?: unknown;
    };
    if (parsed.vercelProductionStripeKeyClass === "live" || parsed.vercelProductionStripeKeyClass === "test") {
      return parsed.vercelProductionStripeKeyClass;
    }
  } catch {
    return "unknown";
  }
  return "unknown";
}

function listVercelProductionEnvNames(): string[] {
  const result = spawnSync("npx", ["vercel", "env", "ls", "production"], {
    encoding: "utf8",
    shell: true,
    timeout: 90000,
    cwd: process.cwd(),
  });
  const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const names: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s+([A-Z][A-Z0-9_]+)\s+Hidden\b/);
    if (match) names.push(match[1]);
  }
  return [...new Set(names)];
}

function vercelCurl(pathName: string): { status: number; text: string } {
  const dir = mkdtempSync(path.join(os.tmpdir(), "row73-"));
  const bodyPath = path.join(dir, "body.txt");
  const headerPath = path.join(dir, "headers.txt");
  try {
    const cmd = [
      "npx vercel curl",
      JSON.stringify(pathName),
      "--deployment",
      JSON.stringify(PRODUCTION_HOST),
      "--yes",
      "-- -sS -D",
      JSON.stringify(headerPath),
      "-o",
      JSON.stringify(bodyPath),
    ].join(" ");
    spawnSync(cmd, {
      encoding: "utf8",
      shell: true,
      timeout: 90000,
      cwd: process.cwd(),
    });
    const headers = existsSync(headerPath) ? readFileSync(headerPath, "utf8") : "";
    const match = headers.match(/HTTP\/[\d.]+\s+(\d{3})/i);
    const status = match ? Number(match[1]) : 0;
    const text = existsSync(bodyPath) ? readFileSync(bodyPath, "utf8") : "";
    return { status, text };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function rowStatusComplete(rel: string): boolean {
  const abs = path.join(process.cwd(), rel);
  if (!existsSync(abs)) return false;
  try {
    const json = JSON.parse(readFileSync(abs, "utf8")) as {
      status?: string;
      founderAccepted?: boolean;
      percentCompleteRecorded?: number;
      rowMarkedComplete?: boolean;
    };
    return (
      json.status === "Complete" ||
      json.founderAccepted === true ||
      json.rowMarkedComplete === true ||
      json.percentCompleteRecorded === 100
    );
  } catch {
    return false;
  }
}

function rowStatusPresent(rel: string): boolean {
  return existsSync(path.join(process.cwd(), rel));
}

function mapStatusIndicator(indicator: string | null | undefined): ServiceStatus {
  const value = (indicator ?? "").toLowerCase();
  if (!value) return "UNABLE TO VERIFY";
  if (value === "none") return "OPERATIONAL";
  if (value === "minor" || value === "maintenance") return "DEGRADED";
  if (value === "major" || value === "critical") return "INCIDENT";
  return "UNABLE TO VERIFY";
}

function emptyStatus(
  vendorId: string,
  url: string,
  httpStatus: number,
  incidentName: string | null = null,
): StatusPageResult {
  return {
    vendorId,
    url,
    httpStatus,
    serviceStatus: "UNABLE TO VERIFY",
    indicator: null,
    incidentName,
  };
}

async function fetchStatusPage(vendorId: string, url: string): Promise<StatusPageResult> {
  if (vendorId === "stripe") {
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
        headers: { "user-agent": "BackHalf-Row73-Capacity/1.0" },
      });
      return {
        vendorId,
        url,
        httpStatus: response.status,
        serviceStatus: "UNABLE TO VERIFY",
        indicator: null,
        incidentName:
          "status.stripe.com reachable; v2 JSON 404 and /current is stale — not treated as launch-day proof",
      };
    } catch {
      return emptyStatus(vendorId, url, 0);
    }
  }

  const jsonUrl = url.replace(/\/?$/, "/") + "api/v2/status.json";
  const summaryUrl = url.replace(/\/?$/, "/") + "api/v2/summary.json";
  const tryUrls =
    url.includes("appsstatus") || url.includes("metastatus") || url.includes("tiktok")
      ? [url]
      : [summaryUrl, jsonUrl, url];
  for (const target of tryUrls) {
    try {
      const response = await fetch(target, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
        headers: { "user-agent": "BackHalf-Row73-Capacity/1.0" },
      });
      if (!response.ok) {
        if (target === tryUrls[tryUrls.length - 1]) return emptyStatus(vendorId, url, response.status);
        continue;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("json")) {
        const body = (await response.json()) as {
          status?: { indicator?: string };
          incidents?: Array<{ name?: string; status?: string }>;
        };
        const indicator = body.status?.indicator ?? null;
        const openIncident = (body.incidents ?? []).find(
          (item) => item.status && item.status !== "resolved" && typeof item.name === "string",
        );
        return {
          vendorId,
          url,
          httpStatus: response.status,
          serviceStatus: mapStatusIndicator(indicator),
          indicator,
          incidentName: openIncident?.name ?? null,
        };
      }
      return emptyStatus(vendorId, url, response.status);
    } catch {
      if (target === tryUrls[tryUrls.length - 1]) return emptyStatus(vendorId, url, 0);
    }
  }
  return emptyStatus(vendorId, url, 0);
}

async function dohLookup(
  name: string,
  type: string,
): Promise<{
  status: number;
  answers: Array<{ type: number; data: string }>;
  authority: Array<{ type: number; data: string }>;
}> {
  try {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`,
      {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) {
      return { status: response.status, answers: [], authority: [] };
    }
    const body = (await response.json()) as {
      Status?: number;
      Answer?: Array<{ type?: number; data?: string }>;
      Authority?: Array<{ type?: number; data?: string }>;
    };
    const mapRows = (rows: Array<{ type?: number; data?: string }> | undefined) =>
      (rows ?? [])
        .filter((row): row is { type: number; data: string } => typeof row.type === "number" && typeof row.data === "string");
    return {
      status: typeof body.Status === "number" ? body.Status : -1,
      answers: mapRows(body.Answer),
      authority: mapRows(body.Authority),
    };
  } catch {
    return { status: -1, answers: [], authority: [] };
  }
}

async function probeUrl(url: string): Promise<{ url: string; status: number }> {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
      headers: { "user-agent": "BackHalf-Row73-Capacity/1.0" },
    });
    return { url, status: response.status };
  } catch {
    return { url, status: 0 };
  }
}

function webhookHostClass(url: string): "vercel_app" | "canonical_domain" | "localhost" | "other" {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return "localhost";
    if (host.endsWith(".vercel.app")) return "vercel_app";
    if (host === "thebackhalf.org" || host === "www.thebackhalf.org") return "canonical_domain";
    return "other";
  } catch {
    return "other";
  }
}

async function stripeAccountPosture(key: string): Promise<{
  retrieved: boolean;
  note: string;
  livemode: boolean | null;
  chargesEnabled: boolean | null;
  payoutsEnabled: boolean | null;
  detailsSubmitted: boolean | null;
  disabledReason: string | null;
  currentlyDueCount: number;
  currentlyDueIds: string[];
}> {
  try {
    const response = await fetch("https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return {
        retrieved: false,
        note: `http_${response.status}`,
        livemode: null,
        chargesEnabled: null,
        payoutsEnabled: null,
        detailsSubmitted: null,
        disabledReason: null,
        currentlyDueCount: 0,
        currentlyDueIds: [],
      };
    }
    const body = (await response.json()) as {
      livemode?: boolean;
      charges_enabled?: boolean;
      payouts_enabled?: boolean;
      details_submitted?: boolean;
      requirements?: { disabled_reason?: string | null; currently_due?: unknown };
    };
    const due = Array.isArray(body.requirements?.currently_due)
      ? body.requirements.currently_due.filter((item): item is string => typeof item === "string").slice(0, 20)
      : [];
    return {
      retrieved: true,
      note: "authenticated_account_read_no_mutation",
      livemode: body.livemode === true,
      chargesEnabled: body.charges_enabled === true,
      payoutsEnabled: body.payouts_enabled === true,
      detailsSubmitted: body.details_submitted === true,
      disabledReason:
        typeof body.requirements?.disabled_reason === "string" ? body.requirements.disabled_reason : null,
      currentlyDueCount: due.length,
      currentlyDueIds: due,
    };
  } catch {
    return {
      retrieved: false,
      note: "fetch_failed",
      livemode: null,
      chargesEnabled: null,
      payoutsEnabled: null,
      detailsSubmitted: null,
      disabledReason: null,
      currentlyDueCount: 0,
      currentlyDueIds: [],
    };
  }
}

async function stripeWebhookPosture(key: string): Promise<{
  retrieved: boolean;
  note: string;
  endpointCount: number;
  enabledCount: number;
  liveEnabledCount: number;
  productionPathMatchCount: number;
  hostClasses: string[];
}> {
  try {
    const response = await fetch("https://api.stripe.com/v1/webhook_endpoints?limit=20", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return {
        retrieved: false,
        note: `http_${response.status}`,
        endpointCount: 0,
        enabledCount: 0,
        liveEnabledCount: 0,
        productionPathMatchCount: 0,
        hostClasses: [],
      };
    }
    const body = (await response.json()) as {
      data?: Array<{ url?: string; status?: string; livemode?: boolean }>;
    };
    const rows = Array.isArray(body.data) ? body.data : [];
    const hostClasses: string[] = [];
    let enabledCount = 0;
    let liveEnabledCount = 0;
    let productionPathMatchCount = 0;
    for (const row of rows) {
      const url = typeof row.url === "string" ? row.url : "";
      const enabled = row.status === "enabled";
      if (enabled) enabledCount += 1;
      if (enabled && row.livemode === true) liveEnabledCount += 1;
      if (url.includes("/api/stripe/webhook")) productionPathMatchCount += 1;
      if (url) hostClasses.push(webhookHostClass(url));
    }
    return {
      retrieved: true,
      note: "authenticated_webhook_list_no_secrets",
      endpointCount: rows.length,
      enabledCount,
      liveEnabledCount,
      productionPathMatchCount,
      hostClasses: [...new Set(hostClasses)],
    };
  } catch {
    return {
      retrieved: false,
      note: "fetch_failed",
      endpointCount: 0,
      enabledCount: 0,
      liveEnabledCount: 0,
      productionPathMatchCount: 0,
      hostClasses: [],
    };
  }
}

function githubOrigin(): { originHost: string; originRepo: string; configured: boolean } {
  const gitConfig = path.join(process.cwd(), ".git", "config");
  if (!existsSync(gitConfig)) {
    return { originHost: "absent", originRepo: "absent", configured: false };
  }
  const raw = readFileSync(gitConfig, "utf8");
  const match = raw.match(/\[remote "origin"\][\s\S]*?url\s*=\s*(\S+)/);
  const url = match?.[1] ?? "";
  if (!url) return { originHost: "absent", originRepo: "absent", configured: false };
  if (/github\.com[:/]TheBackHalf\/website/i.test(url)) {
    return { originHost: "github.com", originRepo: "TheBackHalf/website", configured: true };
  }
  try {
    const parsed = url.startsWith("git@")
      ? new URL(url.replace(/^git@([^:]+):/, "https://$1/"))
      : new URL(url);
    return {
      originHost: parsed.hostname,
      originRepo: parsed.pathname.replace(/^\//, "").replace(/\.git$/, ""),
      configured: parsed.hostname.includes("github.com"),
    };
  } catch {
    return { originHost: "unparsed", originRepo: "unparsed", configured: false };
  }
}

export type Row73Evidence = {
  generatedAt: string;
  registerPath: string;
  productionHost: string;
  canonicalHost: string;
  localEnvNamesPresent: string[];
  vercel: {
    inspectAttempted: boolean;
    inspectOk: boolean;
    authenticated: boolean;
    productionReady: boolean;
    productionReadyState: string | null;
    aliasCount: number;
    envNamePresence: Record<string, boolean>;
    cliEnvNameCount: number;
    cronJobCount: number;
    note: string;
  };
  productionHealth: {
    httpStatus: number;
    ok: boolean | null;
    environment: string | null;
    application: string | null;
    database: string | null;
  };
  productionPages: Array<{ path: string; status: number }>;
  postgresLocal: {
    configured: boolean;
    select1: "ok" | "error" | "unconfigured";
  };
  stripe: {
    localKeyNamePresent: boolean;
    localKeyClass: "live" | "test" | "other" | "absent";
    balanceOk: boolean;
    livemode: boolean | null;
    sandboxKey: boolean | null;
    balanceNote: string;
    account: Awaited<ReturnType<typeof stripeAccountPosture>> | null;
    webhooks: Awaited<ReturnType<typeof stripeWebhookPosture>> | null;
    vercelKeyNamePresent: boolean;
    vercelKeyClass: "live" | "test" | "unknown";
    vercelWebhookSecretNamePresent: boolean;
    vercelPriceNamesPresent: boolean;
    codeWebhookRoutePresent: boolean;
    codeCheckoutPresent: boolean;
  };
  openai: {
    localKeyNamePresent: boolean;
    vercelKeyNamePresent: boolean;
    modelsOk: boolean | null;
    note: string;
    luminaImportsOpenAi: boolean;
  };
  aos: {
    cursorApiKeyPresent: boolean;
    twilioPresent: boolean;
    imapPresent: boolean;
  };
  email: {
    row153Complete: boolean;
    smtpDeliveryPass: boolean;
    smtpAuthRerun: "not_rerun";
    localSmtpNamesPresent: boolean;
    vercelSmtpNamesPresent: boolean;
    mailbox: string;
  };
  dns: {
    soaPresent: boolean;
    aCount: number;
    aaaaCount: number;
    nameserverHint: string | null;
    lookupMethod: string;
  };
  github: {
    originHost: string;
    originRepo: string;
    configured: boolean;
  };
  founderMedia: {
    mp4Count: number;
    heygenRuntimeApiAbsent: boolean;
    elevenLabsAbsent: boolean;
  };
  statusPages: StatusPageResult[];
  leastPrivilege: {
    supportTicketPathIsSupportScoped: boolean;
    launchDashboardsRemainAdmin: boolean;
    supportDeniedAdmin: boolean;
  };
  rowStatuses: {
    row20Complete: boolean;
    row61Complete: boolean;
    row62Complete: boolean;
    row72Present: boolean;
    row74NotStarted: boolean;
    row84Present: boolean;
    row150Complete: boolean;
    row151Present: boolean;
    row153Complete: boolean;
    row199Present: boolean;
    row202Present: boolean;
  };
};

export async function collectRow73Evidence(): Promise<Row73Evidence> {
  const register = loadRow72Register();
  const localNames = loadLocalEnvNamesOnly();
  const hasLocal = (name: string) => localNames.includes(name) || Boolean(process.env[name]?.trim());

  loadServerEnvAllowlist();
  loadPostgresEnvFromLocalFile();
  loadNamedEnvIntoProcess(EXTRA_ENV_LOAD_NAMES);

  let inspect: Awaited<ReturnType<typeof imaniVercelInspect>> | null = null;
  try {
    inspect = await imaniVercelInspect();
  } catch {
    inspect = null;
  }
  const envNames = [
    ...new Set([...(inspect?.envNames ?? []), ...listVercelProductionEnvNames()]),
  ];
  const envNamePresence: Record<string, boolean> = {};
  for (const name of REQUIRED_VERCEL_ENV_NAMES) {
    envNamePresence[name] = envNames.includes(name);
  }

  const healthCurl = vercelCurl("/api/ops/health");
  type HealthBody = {
    ok?: boolean;
    environment?: string;
    checks?: { application?: string; database?: string };
  };
  let healthBody: HealthBody | null = null;
  if (healthCurl.text) {
    try {
      healthBody = JSON.parse(healthCurl.text) as HealthBody;
    } catch {
      healthBody = null;
    }
  }

  const productionPages = (
    ["/", "/register", "/login", "/lumina", "/support", "/checkout"] as const
  ).map((pagePath) => {
    const result = vercelCurl(pagePath);
    return { path: pagePath, status: result.status };
  });

  let select1: "ok" | "error" | "unconfigured" = "unconfigured";
  const postgresConfigured = launchDashboardPostgresConfigured();
  if (postgresConfigured) {
    try {
      const sql = getLaunchDashboardSql();
      if (!sql) {
        select1 = "unconfigured";
      } else {
        const rows = await sql<{ ok: number }[]>`SELECT 1 as ok`;
        select1 = rows[0]?.ok === 1 ? "ok" : "error";
      }
    } catch {
      select1 = "error";
    }
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  const localKeyClass = classifyStripeKey(stripeKey);
  const stripeBalance = await verifyStripeReporting();
  const stripeAccount = stripeKey ? await stripeAccountPosture(stripeKey) : null;
  const stripeWebhooks = stripeKey ? await stripeWebhookPosture(stripeKey) : null;

  const openai = await verifyOpenAiLive();
  const luminaSource = existsSync(path.join(process.cwd(), "lib/lumina/conversation.ts"))
    ? readFileSync(path.join(process.cwd(), "lib/lumina/conversation.ts"), "utf8")
    : "";
  const luminaImportsOpenAi = /openai/i.test(luminaSource);

  const row153 = existsSync(path.join(process.cwd(), "ops/fab-5/row-153-status.json"))
    ? (JSON.parse(readFileSync(path.join(process.cwd(), "ops/fab-5/row-153-status.json"), "utf8")) as {
        actualEmailDelivery?: string;
        googleWorkspaceSmtpAuthentication?: string;
        founderAccepted?: boolean;
      })
    : null;

  const soaLookup = await dohLookup("thebackhalf.org", "SOA");
  const aLookup = await dohLookup("thebackhalf.org", "A");
  const aaaaLookup = await dohLookup("thebackhalf.org", "AAAA");
  const nsLookup = await dohLookup("thebackhalf.org", "NS");
  const soaPresent =
    soaLookup.answers.some((row) => row.type === 6) ||
    soaLookup.authority.some((row) => row.type === 6) ||
    aLookup.authority.some((row) => row.type === 6);
  const aCount = aLookup.answers.filter((row) => row.type === 1).length;
  const aaaaCount = aaaaLookup.answers.filter((row) => row.type === 28).length;
  const nameserverHint =
    nsLookup.answers.find((row) => row.data.toLowerCase().includes("cloudflare"))?.data.replace(/\.$/, "") ??
    nsLookup.answers[0]?.data.replace(/\.$/, "") ??
    null;

  const statusDefs: Array<{ vendorId: string; url: string }> = [
    { vendorId: "vercel", url: "https://www.vercel-status.com" },
    { vendorId: "supabase", url: "https://status.supabase.com" },
    { vendorId: "stripe", url: "https://status.stripe.com" },
    { vendorId: "google_workspace", url: "https://www.google.com/appsstatus/dashboard/" },
    { vendorId: "openai", url: "https://status.openai.com" },
    { vendorId: "heygen", url: "https://status.heygen.com" },
    { vendorId: "cursor", url: "https://status.cursor.com" },
    { vendorId: "github", url: "https://www.githubstatus.com" },
    { vendorId: "instagram", url: "https://metastatus.com" },
    { vendorId: "tiktok", url: "https://status.tiktok.com" },
  ];
  const statusPages = await Promise.all(statusDefs.map((row) => fetchStatusPage(row.vendorId, row.url)));

  return {
    generatedAt: new Date().toISOString(),
    registerPath: ROW72_REGISTER_PATH,
    productionHost: PRODUCTION_HOST,
    canonicalHost: CANONICAL_HOST,
    localEnvNamesPresent: localNames,
    vercel: {
      inspectAttempted: true,
      inspectOk: Boolean(inspect?.ok),
      authenticated: Boolean(inspect?.authenticated),
      productionReady: Boolean(inspect?.production?.ready),
      productionReadyState: inspect?.productionDeployment?.readyState ?? null,
      aliasCount: inspect?.production?.aliasCount ?? 0,
      envNamePresence,
      cliEnvNameCount: envNames.length,
      cronJobCount: (
        JSON.parse(readFileSync(path.join(process.cwd(), "vercel.json"), "utf8")) as {
          crons?: unknown[];
        }
      ).crons?.length ?? 0,
      note: inspect?.note ?? "inspect_unavailable_cli_env_ls_used",
    },
    productionHealth: {
      httpStatus: healthCurl.status,
      ok: healthBody?.ok ?? (healthCurl.status === 200 ? true : null),
      environment: healthBody?.environment ?? null,
      application: healthBody?.checks?.application ?? null,
      database: healthBody?.checks?.database ?? null,
    },
    productionPages,
    postgresLocal: {
      configured: postgresConfigured,
      select1,
    },
    stripe: {
      localKeyNamePresent: hasLocal("STRIPE_SECRET_KEY"),
      localKeyClass,
      balanceOk: stripeBalance.ok,
      livemode: stripeBalance.livemode,
      sandboxKey: stripeBalance.sandboxKey,
      balanceNote: stripeBalance.note,
      account: stripeAccount,
      webhooks: stripeWebhooks,
      vercelKeyNamePresent: envNamePresence.STRIPE_SECRET_KEY === true,
      vercelKeyClass: loadProductionStripeKeyClass(),
      vercelWebhookSecretNamePresent: envNamePresence.STRIPE_WEBHOOK_SECRET === true,
      vercelPriceNamesPresent:
        envNamePresence.STRIPE_PRICE_BLUEPRINT === true &&
        envNamePresence.STRIPE_PRICE_BUNDLE === true &&
        envNamePresence.STRIPE_PRICE_COMMUNITY === true,
      codeWebhookRoutePresent: existsSync(path.join(process.cwd(), "app/api/stripe/webhook/route.ts")),
      codeCheckoutPresent: existsSync(path.join(process.cwd(), "lib/checkout/create-session.ts")),
    },
    openai: {
      localKeyNamePresent: hasLocal("OPENAI_API_KEY"),
      vercelKeyNamePresent: envNamePresence.OPENAI_API_KEY === true,
      modelsOk: openai.ok,
      note: openai.note,
      luminaImportsOpenAi,
    },
    aos: {
      cursorApiKeyPresent: envNamePresence.CURSOR_API_KEY === true,
      twilioPresent: envNames.includes("TWILIO_ACCOUNT_SID"),
      imapPresent: envNames.includes("SUPPORT_IMAP_HOST") || envNames.includes("SUPPORT_IMAP_USER"),
    },
    email: {
      row153Complete: Boolean(row153?.founderAccepted) || rowStatusComplete("ops/fab-5/row-153-status.json"),
      smtpDeliveryPass:
        row153?.actualEmailDelivery === "PASS" && row153?.googleWorkspaceSmtpAuthentication === "PASS",
      smtpAuthRerun: "not_rerun",
      localSmtpNamesPresent: hasLocal("SMTP_HOST") && hasLocal("SMTP_USER") && hasLocal("SMTP_FROM"),
      vercelSmtpNamesPresent:
        envNamePresence.SMTP_HOST === true &&
        envNamePresence.SMTP_USER === true &&
        envNamePresence.SMTP_PASSWORD === true &&
        envNamePresence.SMTP_FROM === true,
      mailbox: "support@thebackhalf.org",
    },
    dns: {
      soaPresent,
      aCount,
      aaaaCount,
      nameserverHint,
      lookupMethod: "dns_over_https_cloudflare_dns_json",
    },
    github: githubOrigin(),
    founderMedia: {
      mp4Count: countMp4(path.join(process.cwd(), "public/videos")),
      heygenRuntimeApiAbsent: !hasLocal("HEYGEN_API_KEY") && !hasLocal("HEYGEN_API_TOKEN"),
      elevenLabsAbsent: !hasLocal("ELEVENLABS_API_KEY") && !hasLocal("ELEVEN_API_KEY"),
    },
    statusPages,
    leastPrivilege: {
      supportTicketPathIsSupportScoped:
        isSupportTicketAdminPath("/ops/admin/support") && !isAdminOpsPath("/ops/admin/support"),
      launchDashboardsRemainAdmin:
        isAdminOpsPath("/ops/admin/launch-kpi") && isAdminOpsPath("/ops/admin/launch-dashboard"),
      supportDeniedAdmin: !roleHasPermission("support", "admin:ops:access"),
    },
    rowStatuses: {
      row20Complete: rowStatusComplete("ops/fab-5/row-20-status.json"),
      row61Complete: rowStatusComplete("ops/fab-5/row-61-status.json"),
      row62Complete: rowStatusComplete("ops/fab-5/row-62-status.json"),
      row72Present: existsSync(path.join(process.cwd(), register.record)),
      row74NotStarted: !rowStatusPresent("ops/fab-5/row-74-status.json"),
      row84Present: rowStatusPresent("ops/fab-5/row-84-status.json"),
      row150Complete: rowStatusComplete("ops/fab-5/row-150-status.json"),
      row151Present: rowStatusPresent("ops/fab-5/row-151-status.json"),
      row153Complete: rowStatusComplete("ops/fab-5/row-153-status.json"),
      row199Present: rowStatusPresent("ops/fab-5/row-199-status.json"),
      row202Present: rowStatusPresent("ops/fab-5/row-202-status.json"),
    },
  };
}

export function statusForVendor(evidence: Row73Evidence, vendorId: string): ServiceStatus {
  return evidence.statusPages.find((row) => row.vendorId === vendorId)?.serviceStatus ?? "UNABLE TO VERIFY";
}
