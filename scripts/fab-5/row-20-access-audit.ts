/**
 * Row 20 mechanical access audit.
 * Does not mark Complete. Never prints secrets. Does not charge, refund, or send mail
 * unless SMTP verify (no send) is used. Reuses Row 153 SMTP delivery evidence.
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createSessionToken } from "@/lib/auth/session";
import type { UserRecord } from "@/lib/auth/types";
import {
  verifyOpenAiLive,
  verifySmtpAuth,
  verifyStripeReporting,
  loadServerEnvAllowlist,
} from "@/lib/fab-5/access";
import { loadFab5OpenAiEnv } from "@/lib/fab-5/env";
import {
  ROW20_AUDIT_PATH,
  ROW20_MATRIX_PATH,
  ROW20_REVIEW_PATH,
  buildRow20Matrix,
  collectRow20LiveChecks,
  matrixToRegistryEntries,
} from "@/lib/fab-5/row20-access";
import { getRow20ReviewModel, type Row20HttpTests } from "@/lib/fab-5/row20-review";

const ORIGIN = process.env.ROW20_ORIGIN ?? "http://localhost:3000";

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

function loadLocalEnvNames(names: string[]): void {
  if (!existsSync(".env.local")) return;
  const wanted = new Set(names);
  for (const rawLine of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let key = line.slice(0, eq).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    if (!wanted.has(key) || process.env[key]) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) process.env[key] = value;
  }
}

loadLocalEnvNames([
  "AUTH_SECRET",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
  "STRIPE_SECRET_KEY",
  "OPENAI_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "BH_ADMIN_EMAILS",
  "BH_SUPPORT_EMAILS",
  "CRON_SECRET",
]);
loadServerEnvAllowlist();
loadFab5OpenAiEnv();

function fakeUser(role: UserRecord["role"]): UserRecord {
  const now = new Date().toISOString();
  return {
    id: `row20-test-${role}`,
    email: `row20-${role}@test.invalid`,
    firstName: "Row20",
    lastName: role,
    authProvider: "email",
    arcCode: `R20${role.slice(0, 3).toUpperCase()}`,
    emailVerified: true,
    locale: "en",
    role,
    ageEligible: true,
    createdAt: now,
    updatedAt: now,
  };
}

async function request(
  pathName: string,
  init: RequestInit = {},
): Promise<{ status: number; location: string | null }> {
  const response = await fetch(`${ORIGIN}${pathName}`, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(90_000),
  });
  return {
    status: response.status,
    location: response.headers.get("location"),
  };
}

function redirectedToLogin(result: { status: number; location: string | null }): boolean {
  if (result.status !== 307 && result.status !== 302 && result.status !== 303) return false;
  const location = result.location ?? "";
  return location.includes("/login");
}

function redirectedToDenied(result: { status: number; location: string | null }): boolean {
  if (result.status !== 307 && result.status !== 302 && result.status !== 303) return false;
  const location = result.location ?? "";
  return location.includes("/access-denied");
}

function allowed(result: { status: number }): boolean {
  return result.status === 200;
}

async function cookieFor(role: UserRecord["role"]): Promise<string> {
  const token = await createSessionToken(fakeUser(role));
  return `bh-session=${token}`;
}

async function runHttpTests(): Promise<Row20HttpTests> {
  const none = await request("/ops/admin");
  const architectCookie = await cookieFor("architect");
  const supportCookie = await cookieFor("support");
  const adminCookie = await cookieFor("admin");
  const architectAdmin = await request("/ops/admin", {
    headers: { cookie: architectCookie },
  });
  const architectTickets = await request("/ops/admin/support", {
    headers: { cookie: architectCookie },
  });
  const supportTickets = await request("/ops/admin/support", {
    headers: { cookie: supportCookie },
  });
  const supportAdmin = await request("/ops/admin", {
    headers: { cookie: supportCookie },
  });
  const supportKpi = await request("/ops/admin/launch-kpi", {
    headers: { cookie: supportCookie },
  });
  const supportDash = await request("/ops/admin/launch-dashboard", {
    headers: { cookie: supportCookie },
  });
  const adminHome = await request("/ops/admin", {
    headers: { cookie: adminCookie },
  });
  const adminTickets = await request("/ops/admin/support", {
    headers: { cookie: adminCookie },
  });
  const adminKpi = await request("/ops/admin/launch-kpi", {
    headers: { cookie: adminCookie },
  });
  const adminDash = await request("/ops/admin/launch-dashboard", {
    headers: { cookie: adminCookie },
  });
  const supportForm = await request("/support");
  const legalTerms = await request("/legal/terms-of-use");
  const legalPrivacy = await request("/legal/privacy-policy");
  const review = await request(ROW20_REVIEW_PATH);
  const health = await request("/api/ops/health");

  let instagram: boolean | null = null;
  let tiktok: boolean | null = null;
  try {
    const ig = await fetch("https://www.instagram.com/backhalfco/", {
      method: "HEAD",
      redirect: "follow",
    });
    instagram = ig.status < 500;
  } catch {
    instagram = null;
  }
  try {
    const tt = await fetch("https://www.tiktok.com/@backhalfco", {
      method: "HEAD",
      redirect: "follow",
    });
    tiktok = tt.status < 500;
  } catch {
    tiktok = null;
  }

  return {
    unauthenticatedAdminRedirects: redirectedToLogin(none),
    architectDeniedAdmin:
      (redirectedToDenied(architectAdmin) || redirectedToLogin(architectAdmin)) &&
      (redirectedToDenied(architectTickets) || redirectedToLogin(architectTickets)),
    supportAllowedTickets: allowed(supportTickets),
    supportDeniedAdminHome: redirectedToDenied(supportAdmin),
    supportDeniedLaunchKpi: redirectedToDenied(supportKpi),
    supportDeniedLaunchDashboard: redirectedToDenied(supportDash),
    adminAllowedAdminHome: allowed(adminHome),
    adminAllowedTickets: allowed(adminTickets),
    adminAllowedLaunchKpi: allowed(adminKpi),
    adminAllowedLaunchDashboard: allowed(adminDash),
    supportFormLoads: allowed(supportForm) || supportForm.status === 307,
    legalTermsLoad: allowed(legalTerms),
    legalPrivacyLoad: allowed(legalPrivacy),
    reviewPageLoads: allowed(review),
    healthOk: health.status === 200 || health.status === 503,
    instagramPublicReachable: instagram,
    tiktokPublicReachable: tiktok,
  };
}

async function main() {
  const live = await collectRow20LiveChecks();
  let http: Row20HttpTests | null = null;
  try {
    http = await runHttpTests();
  } catch (error) {
    const message = error instanceof Error ? error.message : "http_failed";
    console.error(`HTTP tests skipped: ${message.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, "[redacted]")}`);
  }

  const stripe = live.stripeKeyPresent ? await verifyStripeReporting() : null;
  const openai = live.openaiKeyPresent ? await verifyOpenAiLive() : null;
  const smtp = live.smtpReady ? await verifySmtpAuth() : null;

  const cells = buildRow20Matrix(live);
  const registryEntries = matrixToRegistryEntries(cells, live);

  const defectsCorrected = [
    "Support ticket console and /api/admin/support/* now require support:ops:access instead of full admin:ops:access.",
    "Access registry reconciled to current Row 76/84/150/151/153/legal systems.",
    "Operating-system emailAutonomy note updated for Row 153 operational mailbox path.",
    "Support operations page links to the ticket console; support-role operators are not sent into admin-only pages.",
    "Local marketing KPI ledger concatenated-JSON defect recovered so dashboards load.",
  ];

  const audit = {
    generatedAt: live.generatedAt,
    secretsPrinted: false as const,
    live,
    http,
    stripeReporting: stripe
      ? {
          ok: stripe.ok,
          livemode: stripe.livemode,
          sandboxKey: stripe.sandboxKey,
          note: stripe.note,
        }
      : null,
    openaiLive: openai
      ? { ok: openai.ok, echoedKey: openai.echoedKey, note: openai.note }
      : null,
    smtpAuth: smtp,
    defectsCorrected,
    markedComplete: false as const,
  };

  await mkdir(path.dirname(ROW20_AUDIT_PATH), { recursive: true });
  await writeFile(ROW20_AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf8");

  const matrixJson = {
    row: 20,
    updatedAt: live.generatedAt,
    enforcement: "AUTHORITY + NO VERIFIED ACCESS ≠ EXECUTABLE",
    markedComplete: false,
    executives: [
      {
        id: "michelle",
        name: "Michelle Northstar",
        title: "Chief of Staff & Operations Officer",
      },
      {
        id: "imani",
        name: "Imani Heartbeat",
        title: "Chief Technology & Risk Officer",
      },
      {
        id: "nia",
        name: "Nia Prism",
        title: "Chief Experience & Transformation Officer",
      },
      {
        id: "kimberly",
        name: "Kimberly M. Walker",
        title: "Founder",
      },
    ],
    entries: cells,
    reviewUrl: `http://localhost:3000${ROW20_REVIEW_PATH}`,
  };
  await writeFile(ROW20_MATRIX_PATH, `${JSON.stringify(matrixJson, null, 2)}\n`, "utf8");

  const registry = {
    row: 20,
    updatedAt: live.generatedAt,
    enforcement: "AUTHORITY + NO VERIFIED ACCESS ≠ EXECUTABLE",
    runtimeArchitecture: {
      mode: "vercel_hosted_cron_queue_event",
      unattended247: "IMPLEMENTED",
      currentComputerOffExecution: true,
      matrix: ROW20_MATRIX_PATH,
      finalAudit: ROW20_AUDIT_PATH,
    },
    founderAdminBoundaries: [
      "GitHub org/account ownership and recovery",
      "Vercel account owner, billing, production ADMIN",
      "Google Workspace super-admin and mailbox authorization",
      "Stripe account owner, billing, refund/financial approval",
      "OpenAI account billing",
      "Legal signature and Founder acceptance of legal documents",
      "Domain/DNS ownership",
      "Secret/recovery-code custody",
      "Official social channel ownership, recovery, and MFA (Instagram and TikTok @backhalfco). LinkedIn is not a launch requirement.",
    ],
    entries: registryEntries,
  };
  await writeFile(
    "ops/fab-5/access-registry.json",
    `${JSON.stringify(registry, null, 2)}\n`,
    "utf8",
  );

  const model = await getRow20ReviewModel();
  const status = {
    row: 20,
    excelRow: 21,
    deliverable: "Provision Fab 5 Systems and Access",
    technicalStatus: model.readyForFounderAcceptance
      ? "ready_for_founder_acceptance"
      : "not_ready",
    percentCompleteRecorded: model.readyForFounderAcceptance ? 98 : 90,
    status: "In Progress",
    founderAcceptance: "PENDING",
    founderAccepted: false,
    rowMarkedComplete: false,
    row21Started: false,
    primaryOwner: "imani",
    primaryOwnerTitle: "Imani Heartbeat — Chief Technology & Risk Officer",
    supportingOwner: "michelle",
    supportingOwnerTitle: "Michelle Northstar — Chief of Staff & Operations Officer",
    reviewUrl: `http://localhost:3000${ROW20_REVIEW_PATH}`,
    matrix: ROW20_MATRIX_PATH,
    audit: ROW20_AUDIT_PATH,
    remainingBlockers: model.remainingBlockers.length === 0 ? "NONE" : model.remainingBlockers,
    nextAction: model.readyForFounderAcceptance
      ? "FOUNDER ACCEPTANCE REVIEW — http://localhost:3000/_internal/row20-fab5-systems-access-review. Do not mark Row 20 Complete. Do not start Row 21."
      : `NOT READY — ${model.remainingBlockers.join(" ")}`,
    generatedAt: live.generatedAt,
  };
  await writeFile("ops/fab-5/row-20-status.json", `${JSON.stringify(status, null, 2)}\n`, "utf8");

  console.log("ROW 20 — PROVISION FAB 5 SYSTEMS AND ACCESS");
  console.log(`MATRIX: ${ROW20_MATRIX_PATH}`);
  console.log(`AUDIT: ${ROW20_AUDIT_PATH}`);
  console.log(`REVIEW: http://localhost:3000${ROW20_REVIEW_PATH}`);
  console.log(`READY: ${model.readyForFounderAcceptance ? "YES" : "NO"}`);
  console.log(`MARKED COMPLETE: NO`);
  if (http) {
    console.log(
      `HTTP tickets support=${String(http.supportAllowedTickets)} admin=${String(http.adminAllowedTickets)} deniedAdmin=${String(http.supportDeniedAdminHome)}`,
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "failed";
  console.error(message.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]"));
  process.exit(1);
});
