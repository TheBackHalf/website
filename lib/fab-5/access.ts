import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";

import { legalDocumentList } from "@/content/legal/documents";
import type { LaunchExecutiveId, OperatingAgentId } from "@/lib/fab-5/types";

export type AccessState =
  | "VERIFIED"
  | "PROVISIONED — VERIFICATION PENDING"
  | "FOUNDER ACTION REQUIRED"
  | "FOUNDER VERIFICATION REQUIRED"
  | "DEPENDENCY — SYSTEM NOT YET IMPLEMENTED"
  | "NOT A LAUNCH REQUIREMENT"
  | "NOT REQUIRED"
  | "BLOCKED";

export type AccessRegistryEntry = {
  system: string;
  purpose: string;
  executive: LaunchExecutiveId;
  requiredPermission: string;
  actualPermission: string;
  accessState: AccessState;
  credentialType: string;
  verificationMethod: string;
  lastVerifiedAt: string | null;
  restrictions: string;
  FounderAdminRequired: boolean;
  dependency: string | null;
  evidenceReference: string;
};

export type AccessRegistryFile = {
  row: number;
  updatedAt: string;
  enforcement: string;
  runtimeArchitecture: {
    mode: string;
    unattended247: string;
    currentComputerOffExecution: boolean;
  };
  entries: AccessRegistryEntry[];
};

export type AccessQueryResult = {
  question: string;
  executable: boolean;
  classification:
    | "I_HAVE_AUTHORITY_AND_VERIFIED_ACCESS"
    | "AUTHORITY_WITHOUT_VERIFIED_ACCESS"
    | "NO_AUTHORITY"
    | "ACCESS_DEPENDENCY"
    | "FOUNDER_ACTION_REQUIRED"
    | "FUTURE_SYSTEM_DEPENDENCY"
    | "DENIED";
  actingExecutive: LaunchExecutiveId | "unspecified";
  requiredSystems: string[];
  matching: AccessRegistryEntry[];
  answer: string;
};

const SECRET_REQUEST =
  /(retrieve|show|print|echo|dump|reveal).*(secret|api[_ ]?key|\.env|password|recovery code|service.?role)|production secret|what is the (openai|stripe|smtp) (api )?key/i;

const DENIED_REPO =
  /(^|[\\/])\.env(\.|$|local|production)|credentials|service.?role|secret|\.pem$|id_rsa/i;

const ALLOWED_REPO_PREFIXES = ["content/", "lib/fab-5/", "ops/fab-5/", "app/", "scripts/fab-5/"];

let cached: AccessRegistryFile | null = null;

export function resetAccessCacheForTests(): void {
  cached = null;
}

export async function loadAccessRegistry(): Promise<AccessRegistryFile> {
  if (cached) return cached;
  const raw = await readFile("ops/fab-5/access-registry.json", "utf8");
  cached = JSON.parse(raw) as AccessRegistryFile;
  return cached;
}

export function isSecretRetrievalRequest(text: string): boolean {
  return SECRET_REQUEST.test(text);
}

export function systemsRequiredForCommand(command: string): string[] {
  const text = command.toLowerCase();
  const systems = new Set<string>();
  if (/launch (queue|view|row|dashboard)|assigned work|critical path|founder queue|human-expert queue/.test(text)) {
    systems.add("launch_dashboard_work_queues");
  }
  if (/support@|support request|support inbox/.test(text)) systems.add("support_mailbox");
  if (/privacy@|privacy (request|complaint|inbox)/.test(text)) systems.add("privacy_mailbox");
  if (/google workspace|business email/.test(text)) systems.add("google_workspace");
  if (/instagram/.test(text)) systems.add("instagram");
  if (/tiktok/.test(text)) systems.add("tiktok");
  if (/linkedin/.test(text)) systems.add("linkedin");
  if (/publish (an )?approved (instagram|tiktok|linkedin|social)/.test(text) || /social publish/.test(text)) {
    if (/instagram/.test(text)) systems.add("instagram");
    else if (/tiktok/.test(text)) systems.add("tiktok");
    else if (/linkedin/.test(text)) systems.add("linkedin");
    else {
      systems.add("instagram");
      systems.add("tiktok");
    }
  }
  if (/launch kpi|marketing kpi/.test(text)) systems.add("launch_kpi_dashboard");
  if (/launch dashboard|daily launch/.test(text)) systems.add("launch_dashboard");
  if (/support ticket|ticket console|\/ops\/admin\/support/.test(text)) {
    systems.add("support_tickets");
  }
  if (/payment report|stripe|transaction visib|reconciliation/.test(text)) systems.add("stripe_payments");
  if (/vercel|production deploy|deployment issue|production logs|rollback/.test(text)) {
    systems.add("vercel_production");
  }
  if (/journey|blueprint|brand|founder media|lumina source|approved content/.test(text)) {
    systems.add("content_assets");
  }
  if (/legal document|privacy policy|participant agreement|ai disclosure/.test(text)) {
    systems.add("legal_documents");
  }
  if (/openai|agents sdk|fab 5 runtime/.test(text)) systems.add("openai_agents_sdk");
  if (/supabase|production database/.test(text)) systems.add("supabase_backend");
  if (/analytics dashboard|ga4|clarity/.test(text)) {
    systems.add("analytics_third_party");
    systems.add("launch_kpi_dashboard");
  }
  if (/git|repository|source code/.test(text)) systems.add("git_repository");
  return [...systems];
}

function actingExecutive(question: string): LaunchExecutiveId | "unspecified" {
  const text = question.toLowerCase();
  if (/\bnia\b/.test(text)) return "nia";
  if (/\bimani\b/.test(text)) return "imani";
  if (/\bkimberly\b/.test(text)) return "kimberly";
  if (/\bmichelle\b/.test(text)) return "michelle";
  return "unspecified";
}

export function isVerifiedFor(entry: AccessRegistryEntry): boolean {
  return entry.accessState === "VERIFIED";
}

export async function queryAccess(question: string): Promise<AccessQueryResult> {
  const registry = await loadAccessRegistry();
  const required = systemsRequiredForCommand(question);
  const executive = actingExecutive(question);
  const matching = registry.entries.filter((entry) => {
    const systemMatch = required.length === 0 || required.includes(entry.system);
    const execMatch = executive === "unspecified" || entry.executive === executive;
    return systemMatch && execMatch;
  });

  if (isSecretRetrievalRequest(question)) {
    return {
      question,
      executable: false,
      classification: "DENIED",
      actingExecutive: executive,
      requiredSystems: ["secrets_manager"],
      matching: matching.filter((entry) => entry.system === "secrets_manager"),
      answer:
        "DENIED. Agents must not retrieve, print, or echo secret values. AUTHORITY does not grant secret retrieval. I HAVE AUTHORITY is not I HAVE SYSTEM ACCESS, and secret retrieval is never a verified agent capability.",
    };
  }

  const relevant =
    required.length > 0
      ? registry.entries.filter((entry) => {
          if (!required.includes(entry.system)) return false;
          if (executive === "unspecified") {
            return entry.requiredPermission !== "NONE" && entry.accessState !== "NOT REQUIRED";
          }
          return entry.executive === executive;
        })
      : matching;

  const gaps = relevant.filter(
    (entry) =>
      entry.requiredPermission !== "NONE" &&
      entry.accessState !== "NOT REQUIRED" &&
      entry.accessState !== "NOT A LAUNCH REQUIREMENT" &&
      entry.accessState !== "VERIFIED",
  );
  const founderGaps = gaps.filter(
    (entry) =>
      entry.accessState === "FOUNDER ACTION REQUIRED" ||
      entry.accessState === "FOUNDER VERIFICATION REQUIRED",
  );
  const futureGaps = gaps.filter((entry) => entry.accessState === "DEPENDENCY — SYSTEM NOT YET IMPLEMENTED");
  const verifiedNeeded = relevant.filter(
    (entry) =>
      entry.requiredPermission !== "NONE" &&
      entry.accessState !== "NOT REQUIRED" &&
      entry.accessState !== "NOT A LAUNCH REQUIREMENT",
  );
  const allVerified = verifiedNeeded.length > 0 && verifiedNeeded.every((entry) => entry.accessState === "VERIFIED");

  let classification: AccessQueryResult["classification"] = "ACCESS_DEPENDENCY";
  let executable = false;
  if (verifiedNeeded.length === 0 && required.length === 0) {
    classification = "I_HAVE_AUTHORITY_AND_VERIFIED_ACCESS";
    executable = false;
  } else if (allVerified) {
    classification = "I_HAVE_AUTHORITY_AND_VERIFIED_ACCESS";
    executable = true;
  } else if (founderGaps.length > 0) {
    classification = "FOUNDER_ACTION_REQUIRED";
  } else if (futureGaps.length > 0 && futureGaps.length === gaps.length) {
    classification = "FUTURE_SYSTEM_DEPENDENCY";
  } else if (gaps.length > 0) {
    classification = "AUTHORITY_WITHOUT_VERIFIED_ACCESS";
  }

  const gapText = gaps
    .map((entry) => `${entry.system}/${entry.executive}=${entry.accessState}`)
    .slice(0, 12)
    .join("; ");

  const answer = executable
    ? `I HAVE AUTHORITY and I HAVE SYSTEM ACCESS for: ${[...new Set(verifiedNeeded.map((entry) => entry.system))].join(", ")}. Executable.`
    : `ACCESS DEPENDENCY. I HAVE AUTHORITY is not I HAVE SYSTEM ACCESS. AUTHORITY + NO VERIFIED ACCESS ≠ EXECUTABLE. Required: ${required.join(", ") || "see registry"}. Gaps: ${gapText || "none listed"}. Do not claim the work is complete.`;

  return {
    question,
    executable,
    classification,
    actingExecutive: executive,
    requiredSystems: required,
    matching: relevant,
    answer,
  };
}

export function inspectRepoState(requestedPath: string, agent: OperatingAgentId): {
  ok: boolean;
  denied: boolean;
  path: string;
  note: string;
} {
  const normalized = requestedPath.replace(/\\/g, "/").replace(/^\.\//, "");
  if (agent === "nia") {
    return {
      ok: false,
      denied: true,
      path: normalized,
      note: "DENIED. Nia is not authorized for repository/infrastructure inspection.",
    };
  }
  if (DENIED_REPO.test(normalized) || normalized.includes(".env")) {
    return {
      ok: false,
      denied: true,
      path: normalized,
      note: "DENIED. Secret and credential files are not readable by Fab 5 agents.",
    };
  }
  const allowed = ALLOWED_REPO_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  if (!allowed) {
    return {
      ok: false,
      denied: true,
      path: normalized,
      note: "DENIED. Path is outside the agent's scoped source allowlist.",
    };
  }
  // Relative allowlisted paths only. Joining process.cwd() made Turbopack
  // NFT-trace the whole repo into Vercel output (596 MB, ENOSPC on deploy).
  if (!existsSync(normalized)) {
    return { ok: false, denied: false, path: normalized, note: "Path not found." };
  }
  const stat = statSync(normalized);
  if (stat.isDirectory()) {
    const names = readdirSync(normalized).slice(0, 20);
    return { ok: true, denied: false, path: normalized, note: `directory entries=${names.length}` };
  }
  const contents = readFileSync(normalized, "utf8");
  return {
    ok: true,
    denied: false,
    path: normalized,
    note: `file_bytes=${Buffer.byteLength(contents, "utf8")}`,
  };
}

export function legalIndexForAgents(): Array<{
  id: string;
  title: string;
  reviewStatus: string;
  contentPending: boolean;
  implementationEligible: boolean;
}> {
  return legalDocumentList.map((doc) => ({
    id: doc.id,
    title: doc.title,
    reviewStatus: doc.reviewStatus,
    contentPending: doc.contentPending,
    implementationEligible:
      !doc.contentPending &&
      (doc.reviewStatus === "APPROVED" ||
        doc.reviewStatus === "HUMAN-REVIEWED" ||
        doc.reviewStatus === "FOUNDER-ACCEPTED"),
  }));
}

const SERVER_ENV_ALLOWLIST = [
  "STRIPE_SECRET_KEY",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "FOUNDER_NOTIFY_EMAIL",
  "FOUNDER_NOTIFY_SMS",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "CURSOR_API_KEY",
  "AOS_ENGINEERING_REPO",
] as const;

function envLineName(rawName: string): string {
  let name = rawName.trim().replace(/^\uFEFF/, "");
  if (name.startsWith("export ")) name = name.slice(7).trim();
  return name;
}

function normalizeEnvValue(raw: string): string {
  let value = raw.trim().replace(/^\uFEFF/, "");
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

export function loadServerEnvAllowlist(): { namesPresent: string[] } {
  const filePath = ".env.local";
  const present = new Set<string>();
  if (existsSync(filePath)) {
    for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const name = envLineName(line.slice(0, eq));
      if (!SERVER_ENV_ALLOWLIST.includes(name as (typeof SERVER_ENV_ALLOWLIST)[number])) continue;
      if (process.env[name]?.trim()) {
        present.add(name);
        continue;
      }
      const value = normalizeEnvValue(line.slice(eq + 1));
      if (value.length > 0) {
        process.env[name] = value;
        present.add(name);
      }
    }
  }
  for (const name of SERVER_ENV_ALLOWLIST) {
    if (process.env[name]) present.add(name);
  }
  return { namesPresent: [...present] };
}

export function classifyMailboxIdentity(email: string | undefined): string {
  if (!email) return "absent";
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain !== "thebackhalf.org") return "non_workspace_or_other_domain";
  if (local === "support") return "support_mailbox";
  if (local === "privacy") return "privacy_mailbox";
  if (local === "kimberly") return "founder_mailbox";
  return "workspace_other";
}

export async function verifyStripeReporting(): Promise<{
  ok: boolean;
  livemode: boolean | null;
  sandboxKey: boolean | null;
  note: string;
}> {
  loadServerEnvAllowlist();
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return { ok: false, livemode: null, sandboxKey: null, note: "key_absent" };
  const sandboxKey = key.startsWith("sk_test_");
  try {
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return { ok: false, livemode: null, sandboxKey, note: `http_${res.status}` };
    const body = (await res.json()) as { livemode?: boolean };
    return {
      ok: true,
      livemode: body.livemode === true,
      sandboxKey,
      note: "authenticated_balance_read",
    };
  } catch {
    return { ok: false, livemode: null, sandboxKey, note: "fetch_failed" };
  }
}

export async function verifySmtpAuth(): Promise<{
  ok: boolean;
  mailboxKind: string;
  note: string;
}> {
  loadServerEnvAllowlist();
  const { getSmtpConfig, isSmtpReady } = await import("@/lib/auth/email/smtp");
  const config = getSmtpConfig();
  const mailboxKind = classifyMailboxIdentity(config.user);
  if (!isSmtpReady()) {
    return { ok: false, mailboxKind, note: "smtp_incomplete" };
  }
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port === 587,
    auth: { user: config.user, pass: config.password },
  });
  try {
    await transporter.verify();
    return { ok: true, mailboxKind, note: "smtp_auth_verified_no_send" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "verify_failed";
    return {
      ok: false,
      mailboxKind,
      note: message.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, "[redacted-email]").slice(0, 160),
    };
  }
}

export async function verifyOpenAiLive(): Promise<{ ok: boolean; echoedKey: boolean; note: string }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { ok: false, echoedKey: false, note: "key_absent" };
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  const text = await res.text();
  return {
    ok: res.ok,
    echoedKey: text.includes(key),
    note: res.ok ? "authenticated_models_read" : `http_${res.status}`,
  };
}
