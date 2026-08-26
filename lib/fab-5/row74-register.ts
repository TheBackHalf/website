/**
 * Row 74 Credential and Account Recovery Register loader.
 * Does not print secret values.
 * Does not duplicate Row 20 (access matrix) or Row 72 (vendor inventory).
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  isAdminOpsPath,
  isSupportTicketAdminPath,
} from "@/lib/auth/ops-paths";
import { roleHasPermission } from "@/lib/auth/permissions";
import { loadRow72Register, ROW72_REGISTER_PATH } from "@/lib/fab-5/row72-register";

export const ROW74_REGISTER_PATH = "ops/fab-5/credential-account-recovery-register.json";
export const ROW74_REVIEW_PATH = "/_internal/row74-credential-recovery-review";
export const ROW74_REVIEW_URL = `http://localhost:3000${ROW74_REVIEW_PATH}`;
export const ROW74_STATUS_PATH = "ops/fab-5/row-74-status.json";
export const ROW74_PRODUCTION_HOST = "https://website-two-psi-49.vercel.app";

const SECRET_PATTERN =
  /sk_live_|sk_test_|rk_live_|rk_test_|whsec_|postgres(?:ql)?:\/\/[^@\s]+@|CRON_SECRET=|AUTH_SECRET=|sk-proj-|sk-[A-Za-z0-9]{16,}|AIza[A-Za-z0-9]{20,}/i;

export function row74TextContainsSecrets(text: string): boolean {
  return SECRET_PATTERN.test(text);
}

export type RecoveryProcedure = {
  detect: string;
  initiate: string;
  method: string;
  vendorSupport: string;
  replaceCredentials: string;
  verifyAfter: string;
  notify: string;
};

export type Row74Account = {
  id: string;
  service: string;
  launchFunction: string;
  launchCritical: string;
  humanAccountOwner: string;
  operationalOwner: string;
  primaryAdmin: string;
  backupAdminRecoveryPerson: string;
  recoveryEmailStatus: string;
  recoveryPhoneStatus: string;
  mfaStatus: string;
  mfaMethod: string;
  backupRecoveryMethod: string;
  backupCodesStatus: string;
  accountRecoveryProcedure: RecoveryProcedure;
  billingOwnershipRecoveryPath: string;
  singlePersonLockoutRisk: string;
  riskMitigation: string;
  lastVerified: string;
  verificationMethod: string;
  founderVerificationRequired: string;
  status: string;
  score: string;
  recoveryProcedureLocation?: string;
  credentialStorageMethod?: string;
  emergencyEscalationPath?: string;
  evidenceSource?: string;
  runtimeLaunchDependency?: string;
  sourceCodeRemainsRecoverableIndependently?: string;
  mailboxes?: Array<{ address: string; role: string; status: string }>;
};

export type Row74RegisterFile = {
  record: string;
  row: 74;
  authoritative: boolean;
  markedComplete: boolean;
  founderAcceptance: string;
  passwordsStored: false;
  backupCodesStored: false;
  officialInstagram: string;
  officialTikTok: string;
  linkedinLaunchRequirement: string;
  recommendedSecretStore: string;
  leadership: Record<string, { name: string; title: string; humanAccountHolder: boolean; role: string }>;
  lockoutDefinition: string;
  workspacePressureTest: {
    namedSocialRecoveryMailbox: string;
    circularIfWorkspaceLocked: boolean;
    independentRecoveryRequired: string;
    independentRecoveryStatus: string;
    doNotCreateSecondSuperAdminAutomatically: boolean;
  };
  recoveryDependencyMap: {
    pass: boolean;
    hub: string;
    independentHubRecovery: string;
    edges: Array<{ from: string; to: string; via: string }>;
    circularDependencies: string[];
    singlePointsOfRecoveryFailure: string[];
  };
  accounts: Row74Account[];
  previousRegisterGeneratedAt?: string;
  audit?: string;
  stripeCloudflareAudit?: Record<string, unknown>;
  circularDependenciesNote?: string;
};

export function loadRow74Register(): Row74RegisterFile {
  const abs = path.join(process.cwd(), ROW74_REGISTER_PATH);
  return JSON.parse(readFileSync(abs, "utf8")) as Row74RegisterFile;
}

function envNamePresentInLocalFile(name: string): boolean {
  const filePath = path.join(process.cwd(), ".env.local");
  if (!existsSync(filePath)) return Boolean(process.env[name]?.trim());
  for (const raw of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let key = line.slice(0, eq).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    const value = line.slice(eq + 1).trim();
    if (key === name && value.length > 0) return true;
  }
  return Boolean(process.env[name]?.trim());
}

function githubOriginIndependent(): boolean {
  const gitConfig = path.join(process.cwd(), ".git", "config");
  if (!existsSync(gitConfig)) return false;
  const raw = readFileSync(gitConfig, "utf8");
  return /github\.com[:/]TheBackHalf\/website/i.test(raw);
}

function rowStatusComplete(rel: string): boolean {
  const abs = path.join(process.cwd(), rel);
  if (!existsSync(abs)) return false;
  try {
    const json = JSON.parse(readFileSync(abs, "utf8")) as {
      status?: string;
      founderAccepted?: boolean;
      rowMarkedComplete?: boolean;
      percentCompleteRecorded?: number;
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

export type Row74LiveChecks = {
  generatedAt: string;
  secretsInRegister: boolean;
  passwordsStored: boolean;
  backupCodesStored: boolean;
  githubOriginIndependent: boolean;
  cursorNotSoleSource: boolean;
  elevenLabsEnvAbsent: boolean;
  heygenEnvAbsent: boolean;
  smtpNamesPresent: boolean;
  officialInstagram: boolean;
  officialTikTok: boolean;
  linkedinNotRequired: boolean;
  supportTicketPathIsSupportScoped: boolean;
  launchDashboardsRemainAdmin: boolean;
  supportDeniedAdmin: boolean;
  row20Complete: boolean;
  row61Complete: boolean;
  row62Complete: boolean;
  row72Present: boolean;
  row153Complete: boolean;
  aiExecutivesNotHumanHolders: boolean;
  workspaceIndependentRecoveryNotCircularInRegister: boolean;
  namedSocialRecoveryIsKimberly: boolean;
};

export function collectRow74LiveChecks(): Row74LiveChecks {
  const register = loadRow74Register();
  const registerRaw = readFileSync(path.join(process.cwd(), ROW74_REGISTER_PATH), "utf8");
  const originOk = githubOriginIndependent();
  const leadership = register.leadership;
  return {
    generatedAt: new Date().toISOString(),
    secretsInRegister: row74TextContainsSecrets(registerRaw),
    passwordsStored: Boolean(register.passwordsStored),
    backupCodesStored: Boolean(register.backupCodesStored),
    githubOriginIndependent: originOk,
    cursorNotSoleSource:
      originOk &&
      register.accounts.some(
        (row) => row.id === "cursor" && row.sourceCodeRemainsRecoverableIndependently === "PASS",
      ),
    elevenLabsEnvAbsent:
      !envNamePresentInLocalFile("ELEVENLABS_API_KEY") && !envNamePresentInLocalFile("ELEVEN_API_KEY"),
    heygenEnvAbsent:
      !envNamePresentInLocalFile("HEYGEN_API_KEY") && !envNamePresentInLocalFile("HEYGEN_API_TOKEN"),
    smtpNamesPresent:
      envNamePresentInLocalFile("SMTP_HOST") &&
      envNamePresentInLocalFile("SMTP_USER") &&
      envNamePresentInLocalFile("SMTP_FROM"),
    officialInstagram: register.officialInstagram === "@backhalfco",
    officialTikTok: register.officialTikTok === "@backhalfco",
    linkedinNotRequired: register.linkedinLaunchRequirement.startsWith("NO"),
    supportTicketPathIsSupportScoped:
      isSupportTicketAdminPath("/ops/admin/support") && !isAdminOpsPath("/ops/admin/support"),
    launchDashboardsRemainAdmin:
      isAdminOpsPath("/ops/admin/launch-kpi") && isAdminOpsPath("/ops/admin/launch-dashboard"),
    supportDeniedAdmin: !roleHasPermission("support", "admin:ops:access"),
    row20Complete: rowStatusComplete("ops/fab-5/row-20-status.json"),
    row61Complete: rowStatusComplete("ops/fab-5/row-61-status.json"),
    row62Complete: rowStatusComplete("ops/fab-5/row-62-status.json"),
    row72Present: existsSync(path.join(process.cwd(), ROW72_REGISTER_PATH)),
    row153Complete: rowStatusComplete("ops/fab-5/row-153-status.json"),
    aiExecutivesNotHumanHolders:
      leadership.michelle.humanAccountHolder === false &&
      leadership.imani.humanAccountHolder === false &&
      leadership.nia.humanAccountHolder === false &&
      leadership.founder.humanAccountHolder === true,
    workspaceIndependentRecoveryNotCircularInRegister:
      register.workspacePressureTest.independentRecoveryRequired.includes("not @thebackhalf.org") ||
      register.workspacePressureTest.independentRecoveryRequired.includes("not @thebackhalf"),
    namedSocialRecoveryIsKimberly:
      register.workspacePressureTest.namedSocialRecoveryMailbox === "kimberly@thebackhalf.org",
  };
}

export function row72LaunchCriticalCovered(register: Row74RegisterFile): boolean {
  const vendors = loadRow72Register().vendors.filter((row) => row.launchCritical.startsWith("YES"));
  const ids = new Set(register.accounts.map((row) => row.id));
  return vendors.every((vendor) => {
    if (vendor.id === "domain_dns") {
      return ids.has("domain_registrar") && ids.has("dns_provider");
    }
    return ids.has(vendor.id);
  });
}

export function procedureComplete(procedure: RecoveryProcedure): boolean {
  return [
    procedure.detect,
    procedure.initiate,
    procedure.method,
    procedure.vendorSupport,
    procedure.replaceCredentials,
    procedure.verifyAfter,
    procedure.notify,
  ].every((field) => field.trim().length > 0);
}

export function passFail(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}
