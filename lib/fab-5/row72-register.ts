/**
 * Row 72 Vendor and SaaS Dependency Register loader.
 * Does not print secret values. Does not rebuild vendor entries.
 * Founder acceptance is recorded in ops/fab-5/row-72-status.json.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import {
  isAdminOpsPath,
  isSupportTicketAdminPath,
} from "@/lib/auth/ops-paths";
import { roleHasPermission } from "@/lib/auth/permissions";

export const ROW72_REGISTER_PATH = "ops/fab-5/vendor-saas-register.json";
export const ROW72_REVIEW_PATH = "/_internal/row72-vendor-dependency-review";
export const ROW72_REVIEW_URL = `http://localhost:3000${ROW72_REVIEW_PATH}`;
export const ROW72_STATUS_PATH = "ops/fab-5/row-72-status.json";

export type Row72Vendor = {
  id: string;
  vendorService: string;
  function: string;
  launchCritical: string;
  productionUse: string;
  dependentProductSystem: string;
  operationalOwner: string;
  accountOwner: string;
  billingOwner: string;
  currentPlanLevel: string;
  billingCadence: string;
  renewalBillingDateOrMethod: string;
  autoRenewalStatus: string;
  paymentMethodStatus: string;
  usageLimitQuota: string;
  currentCapacityStatus: string;
  supportPath: string;
  statusPage: string;
  credentialOwner: string;
  mfaOwner: string;
  backupAdminRecoveryOwner: string;
  productionConfigurationVerified: string;
  fallbackContingency: string;
  failureImpact: string;
  dependentLaunchReadinessRows: number[];
  verificationSource: string;
  verificationStatus: "PASS" | "FAIL" | "FOUNDER VERIFICATION REQUIRED";
  founderActionRequired: string;
};

export type Row72RegisterFile = {
  record: string;
  row: 72;
  authoritative: boolean;
  generatedAt: string;
  markedComplete: boolean;
  founderAcceptance: string;
  founderAcceptedAt?: string;
  row73Started: boolean;
  row74Started: boolean;
  officialInstagram: string;
  officialTikTok: string;
  linkedinLaunchRequirement: string;
  noRefundPolicyPreserved: boolean;
  legalVersion: string;
  currentArchitecture: Record<string, string>;
  envNamesInspectedNeverValues: string[];
  excludedVendors: Array<{ vendor: string; reason: string }>;
  vendors: Row72Vendor[];
};

const SECRET_PATTERN =
  /sk_live_|sk_test_|rk_live_|rk_test_|whsec_|postgres(?:ql)?:\/\/[^@\s]+@|CRON_SECRET=|AUTH_SECRET=|sk-[A-Za-z0-9]|AIza[A-Za-z0-9]/i;

export function registerContainsSecrets(text: string): boolean {
  return SECRET_PATTERN.test(text);
}

export function loadRow72Register(): Row72RegisterFile {
  const abs = path.join(process.cwd(), ROW72_REGISTER_PATH);
  return JSON.parse(readFileSync(abs, "utf8")) as Row72RegisterFile;
}

export type Row72StatusFile = {
  founderAccepted?: boolean;
  founderAcceptance?: string;
  status?: string;
  rowMarkedComplete?: boolean;
};

export function loadRow72Status(): Row72StatusFile | null {
  const abs = path.join(process.cwd(), ROW72_STATUS_PATH);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as Row72StatusFile;
  } catch {
    return null;
  }
}

export function row72FounderAccepted(status: Row72StatusFile | null = loadRow72Status()): boolean {
  return status?.founderAccepted === true || status?.founderAcceptance === "YES";
}

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

function envNamePresent(name: string): boolean {
  return Boolean(process.env[name]?.trim());
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
    const value = line.slice(eq + 1).trim();
    if (value.length > 0) present.push(key);
  }
  return present;
}

export type Row72LiveChecks = {
  generatedAt: string;
  secretsInRegister: boolean;
  founderMediaMp4Count: number;
  heygenEnvAbsent: boolean;
  elevenLabsEnvAbsent: boolean;
  resendEnvAbsent: boolean;
  ga4EnvAbsent: boolean;
  localEnvNamesPresent: string[];
  openaiKeyNamePresent: boolean;
  stripeKeyNamePresent: boolean;
  smtpNamesPresent: boolean;
  googleOauthNamesPresent: boolean;
  postgresNamesPresent: boolean;
  officialInstagram: boolean;
  officialTikTok: boolean;
  linkedinNotRequired: boolean;
  supportTicketPathIsSupportScoped: boolean;
  launchDashboardsRemainAdmin: boolean;
  supportDeniedAdmin: boolean;
  row20Complete: boolean;
  row61Complete: boolean;
  row62Complete: boolean;
  row84Present: boolean;
  row150Complete: boolean;
  row151Present: boolean;
  row153Complete: boolean;
  firstPartyAnalytics: boolean;
  legalV1Present: boolean;
};

export function collectRow72LiveChecks(): Row72LiveChecks {
  const localNames = loadLocalEnvNamesOnly();
  const has = (name: string) => localNames.includes(name) || envNamePresent(name);
  const rowStatus = (rel: string) => {
    const abs = path.join(process.cwd(), rel);
    if (!existsSync(abs)) return false;
    try {
      const json = JSON.parse(readFileSync(abs, "utf8")) as {
        status?: string;
        founderAccepted?: boolean;
        percentCompleteRecorded?: number;
      };
      return (
        json.status === "Complete" ||
        json.founderAccepted === true ||
        json.percentCompleteRecorded === 100
      );
    } catch {
      return false;
    }
  };

  const registerRaw = readFileSync(path.join(process.cwd(), ROW72_REGISTER_PATH), "utf8");
  const socialAbs = path.join(process.cwd(), "ops/fab-5/social-channels.json");
  const social = JSON.parse(readFileSync(socialAbs, "utf8")) as {
    preferredHandle?: string;
    channels?: {
      instagram?: { preferredHandle?: string };
      tiktok?: { preferredHandle?: string };
      linkedin?: { scope?: string };
    };
  };

  return {
    generatedAt: new Date().toISOString(),
    secretsInRegister: registerContainsSecrets(registerRaw),
    founderMediaMp4Count: countMp4(path.join(process.cwd(), "public/videos")),
    heygenEnvAbsent: !has("HEYGEN_API_KEY") && !has("HEYGEN_API_TOKEN"),
    elevenLabsEnvAbsent: !has("ELEVENLABS_API_KEY") && !has("ELEVEN_API_KEY"),
    resendEnvAbsent: !has("RESEND_API_KEY"),
    ga4EnvAbsent: !has("GA_MEASUREMENT_ID") && !has("NEXT_PUBLIC_GA_ID"),
    localEnvNamesPresent: localNames,
    openaiKeyNamePresent: has("OPENAI_API_KEY"),
    stripeKeyNamePresent: has("STRIPE_SECRET_KEY"),
    smtpNamesPresent: has("SMTP_HOST") && has("SMTP_USER") && has("SMTP_FROM"),
    googleOauthNamesPresent: has("GOOGLE_CLIENT_ID") && has("GOOGLE_CLIENT_SECRET"),
    postgresNamesPresent: has("POSTGRES_URL") || has("POSTGRES_URL_NON_POOLING"),
    officialInstagram:
      social.preferredHandle === "backhalfco" &&
      social.channels?.instagram?.preferredHandle === "backhalfco",
    officialTikTok: social.channels?.tiktok?.preferredHandle === "backhalfco",
    linkedinNotRequired: social.channels?.linkedin?.scope === "FUTURE ENHANCEMENT",
    supportTicketPathIsSupportScoped:
      isSupportTicketAdminPath("/ops/admin/support") &&
      !isAdminOpsPath("/ops/admin/support"),
    launchDashboardsRemainAdmin:
      isAdminOpsPath("/ops/admin/launch-kpi") &&
      isAdminOpsPath("/ops/admin/launch-dashboard"),
    supportDeniedAdmin: !roleHasPermission("support", "admin:ops:access"),
    row20Complete: rowStatus("ops/fab-5/row-20-status.json"),
    row61Complete: rowStatus("ops/fab-5/row-61-status.json"),
    row62Complete: rowStatus("ops/fab-5/row-62-status.json"),
    row84Present: existsSync(path.join(process.cwd(), "ops/fab-5/row-84-status.json")),
    row150Complete: rowStatus("ops/fab-5/row-150-status.json"),
    row151Present: existsSync(path.join(process.cwd(), "ops/fab-5/row-151-status.json")),
    row153Complete: rowStatus("ops/fab-5/row-153-status.json"),
    firstPartyAnalytics:
      existsSync(path.join(process.cwd(), "ops/fab-5/ROW-150-EVENT-TRACKING-SPECIFICATION.md")) &&
      readFileSync(
        path.join(process.cwd(), "ops/fab-5/ROW-150-EVENT-TRACKING-SPECIFICATION.md"),
        "utf8",
      ).includes("No GA4"),
    legalV1Present: existsSync(path.join(process.cwd(), "ops/fab-5/legal-v1")),
  };
}

export function passFail(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}
