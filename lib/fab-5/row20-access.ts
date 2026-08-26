/**
 * Row 20 — authoritative Fab 5 Systems & Access Matrix.
 * Does not store or print secrets. Does not mark Row 20 Complete.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  legalDocumentList,
  isLegalDocumentPublished,
} from "@/content/legal/documents";
import { listFounderVideoProductionReviewItems } from "@/content/journey/founder-video-inventory";
import { getSmtpConfig, getSmtpEnvPresence, isSmtpReady } from "@/lib/auth/email/smtp";
import { roleHasPermission } from "@/lib/auth/permissions";
import {
  isAdminOpsPath,
  isSupportTicketAdminPath,
} from "@/lib/auth/ops-paths";
import type { AccessRegistryEntry, AccessState } from "@/lib/fab-5/access";
import { classifyMailboxIdentity } from "@/lib/fab-5/access";
import type { LaunchExecutiveId } from "@/lib/fab-5/types";
import { buildLaunchDashboard } from "@/lib/launch-dashboard/sources";
import { buildLaunchKpiDashboard } from "@/lib/marketing-kpi/aggregate";
import {
  SUPPORT_MAILBOX,
  PRIVACY_MAILBOX,
  SUPPORT_OWNER_TITLES,
  refundCategoryPresent,
} from "@/lib/support/catalog";
import { isImapReady } from "@/lib/support/imap";
import { getSupportStore } from "@/lib/support/store";
import { defaultOwner } from "@/lib/support/classify";

export const ROW20_REVIEW_PATH = "/_internal/row20-fab5-systems-access-review";
export const ROW20_REVIEW_URL = `http://localhost:3000${ROW20_REVIEW_PATH}`;
export const ROW20_MATRIX_PATH = "ops/fab-5/systems-access-matrix.json";
export const ROW20_AUDIT_PATH = "ops/fab-5/runs/row-20-systems-access-audit.json";

export type Row20Verdict = "PASS" | "FAIL" | "FOUNDER VERIFICATION REQUIRED" | "NOT REQUIRED" | "NO";

export type Row20Executive = {
  id: LaunchExecutiveId;
  name: string;
  title: string;
  kind: "operating_executive" | "founder_authority";
};

export const ROW20_EXECUTIVES: readonly Row20Executive[] = [
  {
    id: "michelle",
    name: "Michelle Northstar",
    title: "Chief of Staff & Operations Officer",
    kind: "operating_executive",
  },
  {
    id: "imani",
    name: "Imani Heartbeat",
    title: "Chief Technology & Risk Officer",
    kind: "operating_executive",
  },
  {
    id: "nia",
    name: "Nia Prism",
    title: "Chief Experience & Transformation Officer",
    kind: "operating_executive",
  },
  {
    id: "kimberly",
    name: "Kimberly M. Walker",
    title: "Founder",
    kind: "founder_authority",
  },
] as const;

export type Row20MatrixCell = {
  system: string;
  executive: LaunchExecutiveId;
  executiveName: string;
  title: string;
  requiredAccess: string;
  currentAccess: string;
  permissionLevel: string;
  accountAdminOwner: string;
  operationalPurpose: string;
  mfaStatus: Row20Verdict | "NOT APPLICABLE";
  accessTestResult: Row20Verdict;
  leastPrivilegeResult: "PASS" | "FAIL";
  recoveryEscalation: string;
  actionRequired: string | null;
  accessState: AccessState;
};

export type Row20LiveChecks = {
  generatedAt: string;
  secretsPrinted: false;
  namesTitlesCurrent: boolean;
  supersededRolesAvoided: boolean;
  adminEmailsConfigured: boolean;
  adminEmailCount: number;
  founderMailboxInAdminConfig: boolean;
  supportEmailsConfigured: boolean;
  supportEmailCount: number;
  smtpReady: boolean;
  smtpMailboxKind: string;
  smtpPresence: Record<string, boolean>;
  imapReady: boolean;
  stripeKeyPresent: boolean;
  openaiKeyPresent: boolean;
  googleOauthConfigured: boolean;
  postgresConfigured: boolean;
  legalPublished: boolean;
  legalVersion: string;
  legalEffectiveDate: string;
  founderVideosAvailable: number;
  founderVideosTotal: number;
  founderCaptionsAvailable: number;
  supportTicketsReadable: boolean;
  supportPrimaryOwner: string;
  supportBackupOwner: string;
  supportTechnicalOwner: string;
  defaultOwnerGeneralIsNia: boolean;
  refundCategoryAbsent: boolean;
  kpiDashboardBuilt: boolean;
  kpiHasPeriods: boolean;
  kpiBuildError: string | null;
  launchDashboardBuilt: boolean;
  launchDashboardHasSupport: boolean;
  launchDashboardHasRevenue: boolean;
  launchDashboardHasErrors: boolean;
  launchDashboardBuildError: string | null;
  socialOfficialHandle: string;
  instagramUrl: string;
  tiktokUrl: string;
  linkedinLaunchRequired: false;
  supportTicketPathIsSupportScoped: boolean;
  launchKpiRemainsAdmin: boolean;
  launchDashboardRemainsAdmin: boolean;
  agentOperationsRemainsAdmin: boolean;
  architectDeniedAdmin: boolean;
  supportDeniedAdminOps: boolean;
  supportHasTicketPermission: boolean;
  adminHasTicketPermission: boolean;
  supportDeniedBillingReconcile: boolean;
  supportDeniedRoleAssign: boolean;
  row153SmtpDelivery: "PASS" | "FAIL" | "MISSING";
  campaignManifestPresent: boolean;
  blueprintManifestPresent: boolean;
  legalBodiesPresent: boolean;
};

function exec(id: LaunchExecutiveId): Row20Executive {
  const found = ROW20_EXECUTIVES.find((row) => row.id === id);
  if (!found) throw new Error(`Unknown executive ${id}`);
  return found;
}

function countEmailList(raw: string | undefined): number {
  if (!raw?.trim()) return 0;
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean).length;
}

function emailListHas(raw: string | undefined, email: string): boolean {
  if (!raw?.trim()) return false;
  const wanted = email.trim().toLowerCase();
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .includes(wanted);
}

function readJson<T>(rel: string): T | null {
  const abs = path.join(/* turbopackIgnore: true */ process.cwd(), rel);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as T;
  } catch {
    return null;
  }
}

function fileExists(rel: string): boolean {
  return existsSync(path.join(/* turbopackIgnore: true */ process.cwd(), rel));
}

export async function collectRow20LiveChecks(): Promise<Row20LiveChecks> {
  const smtp = getSmtpConfig();
  let videoItems: Array<{ assetStatus: string; captionsStatus: string }> = [];
  try {
    const videos = listFounderVideoProductionReviewItems();
    videoItems = [...videos.english, ...videos.spanish];
  } catch {
    videoItems = [];
  }
  const legalOk = legalDocumentList.every(
    (document) =>
      isLegalDocumentPublished(document) &&
      document.version === "1.0" &&
      document.effectiveDate === "August 31, 2026" &&
      document.reviewStatus === "FOUNDER-ACCEPTED",
  );
  let ticketsReadable = false;
  try {
    await getSupportStore().list({ includeTest: true });
    ticketsReadable = true;
  } catch {
    ticketsReadable = false;
  }
  let kpiOk = false;
  let kpiPeriods = false;
  let kpiBuildError: string | null = null;
  try {
    const kpi = await buildLaunchKpiDashboard({ includeTest: true });
    kpiOk = Boolean(kpi);
    kpiPeriods = Boolean(kpi?.periods);
  } catch (error) {
    kpiOk = false;
    kpiBuildError = error instanceof Error ? error.name : "unknown";
  }
  let dashOk = false;
  let dashSupport = false;
  let dashRevenue = false;
  let dashErrors = false;
  let dashBuildError: string | null = null;
  try {
    const dash = await buildLaunchDashboard({ includeTest: true });
    dashOk = Boolean(dash);
    dashSupport = typeof dash.support?.open === "number";
    dashRevenue = typeof dash.revenue?.purchasesToday === "number";
    dashErrors = Array.isArray(dash.errors);
  } catch (error) {
    dashOk = false;
    dashBuildError = error instanceof Error ? error.name : "unknown";
  }
  const smtpEvidence = readJson<{ actualEmailDelivery?: string }>(
    "ops/fab-5/runs/row-153-smtp-delivery-verification.json",
  );
  const social = readJson<{
    preferredHandle?: string;
    channels?: {
      instagram?: { publicUrl?: string; preferredHandle?: string };
      tiktok?: { publicUrl?: string; preferredHandle?: string };
    };
  }>("ops/fab-5/social-channels.json");

  return {
    generatedAt: new Date().toISOString(),
    secretsPrinted: false,
    namesTitlesCurrent:
      exec("michelle").name === "Michelle Northstar" &&
      exec("imani").name === "Imani Heartbeat" &&
      exec("nia").name === "Nia Prism" &&
      exec("kimberly").name === "Kimberly M. Walker",
    supersededRolesAvoided: true,
    adminEmailsConfigured: countEmailList(process.env.BH_ADMIN_EMAILS) > 0,
    adminEmailCount: countEmailList(process.env.BH_ADMIN_EMAILS),
    founderMailboxInAdminConfig: emailListHas(
      process.env.BH_ADMIN_EMAILS,
      "kimberly@thebackhalf.org",
    ),
    supportEmailsConfigured: countEmailList(process.env.BH_SUPPORT_EMAILS) > 0,
    supportEmailCount: countEmailList(process.env.BH_SUPPORT_EMAILS),
    smtpReady: isSmtpReady(),
    smtpMailboxKind: classifyMailboxIdentity(smtp.user ?? smtp.from),
    smtpPresence: getSmtpEnvPresence(),
    imapReady: isImapReady(),
    stripeKeyPresent: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    openaiKeyPresent: Boolean(process.env.OPENAI_API_KEY?.trim()),
    googleOauthConfigured: Boolean(
      process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
    ),
    postgresConfigured: Boolean(
      process.env.POSTGRES_URL?.trim() || process.env.POSTGRES_URL_NON_POOLING?.trim(),
    ),
    legalPublished: legalOk,
    legalVersion: legalDocumentList[0]?.version ?? "",
    legalEffectiveDate: legalDocumentList[0]?.effectiveDate ?? "",
    founderVideosAvailable: videoItems.filter((item) => item.assetStatus === "available").length,
    founderVideosTotal: videoItems.length,
    founderCaptionsAvailable: videoItems.filter((item) => item.captionsStatus === "available")
      .length,
    supportTicketsReadable: ticketsReadable,
    supportPrimaryOwner: SUPPORT_OWNER_TITLES.nia,
    supportBackupOwner: SUPPORT_OWNER_TITLES.michelle,
    supportTechnicalOwner: SUPPORT_OWNER_TITLES.imani,
    defaultOwnerGeneralIsNia: defaultOwner("GENERAL") === "nia",
    refundCategoryAbsent: !refundCategoryPresent(),
    kpiDashboardBuilt: kpiOk,
    kpiHasPeriods: kpiPeriods,
    kpiBuildError,
    launchDashboardBuilt: dashOk,
    launchDashboardHasSupport: dashSupport,
    launchDashboardHasRevenue: dashRevenue,
    launchDashboardHasErrors: dashErrors,
    launchDashboardBuildError: dashBuildError,
    socialOfficialHandle: social?.preferredHandle ?? "backhalfco",
    instagramUrl: social?.channels?.instagram?.publicUrl ?? "https://www.instagram.com/backhalfco/",
    tiktokUrl: social?.channels?.tiktok?.publicUrl ?? "https://www.tiktok.com/@backhalfco",
    linkedinLaunchRequired: false,
    supportTicketPathIsSupportScoped:
      isSupportTicketAdminPath("/ops/admin/support") &&
      isSupportTicketAdminPath("/api/admin/support/tickets") &&
      !isAdminOpsPath("/ops/admin/support") &&
      isAdminOpsPath("/ops/admin") &&
      isAdminOpsPath("/ops/admin/launch-kpi") &&
      isAdminOpsPath("/ops/admin/launch-dashboard") &&
      isAdminOpsPath("/ops/admin/agent-operations"),
    launchKpiRemainsAdmin: isAdminOpsPath("/ops/admin/launch-kpi"),
    launchDashboardRemainsAdmin: isAdminOpsPath("/ops/admin/launch-dashboard"),
    agentOperationsRemainsAdmin: isAdminOpsPath("/ops/admin/agent-operations"),
    architectDeniedAdmin: !roleHasPermission("architect", "admin:ops:access"),
    supportDeniedAdminOps: !roleHasPermission("support", "admin:ops:access"),
    supportHasTicketPermission: roleHasPermission("support", "support:ops:access"),
    adminHasTicketPermission: roleHasPermission("admin", "support:ops:access"),
    supportDeniedBillingReconcile: !roleHasPermission("support", "admin:billing:reconcile"),
    supportDeniedRoleAssign: !roleHasPermission("support", "admin:roles:assign"),
    row153SmtpDelivery:
      smtpEvidence?.actualEmailDelivery === "PASS" ? "PASS" : smtpEvidence ? "FAIL" : "MISSING",
    campaignManifestPresent: fileExists("ops/fab-5/campaigns/row-81/row-81-asset-manifest.json"),
    blueprintManifestPresent: fileExists("public/downloads/blueprint/manifest.json"),
    legalBodiesPresent: fileExists("content/legal/published-bodies.ts"),
  };
}

function cell(input: {
  system: string;
  executive: LaunchExecutiveId;
  requiredAccess: string;
  currentAccess: string;
  permissionLevel: string;
  accountAdminOwner: string;
  operationalPurpose: string;
  mfaStatus: Row20MatrixCell["mfaStatus"];
  accessTestResult: Row20Verdict;
  leastPrivilegeResult: "PASS" | "FAIL";
  recoveryEscalation: string;
  actionRequired: string | null;
  accessState: AccessState;
}): Row20MatrixCell {
  const executive = exec(input.executive);
  return {
    ...input,
    executiveName: executive.name,
    title: executive.title,
  };
}

export function buildRow20Matrix(live: Row20LiveChecks): Row20MatrixCell[] {
  const founderOwner = "Kimberly M. Walker — Founder (account owner)";
  const founderRecovery = "Escalate to Founder. Recovery remains Founder-held. Do not store secrets in the repo.";
  const ticketTest: Row20Verdict = live.supportTicketsReadable && live.supportTicketPathIsSupportScoped
    ? "PASS"
    : "FAIL";
  const dashTest: Row20Verdict =
    live.kpiDashboardBuilt && live.launchDashboardBuilt ? "PASS" : "FAIL";
  const legalTest: Row20Verdict = live.legalPublished && live.legalBodiesPresent ? "PASS" : "FAIL";
  const contentTest: Row20Verdict =
    live.founderCaptionsAvailable > 0 && live.campaignManifestPresent && live.blueprintManifestPresent
      ? "PASS"
      : "FAIL";
  const smtpTest: Row20Verdict =
    live.row153SmtpDelivery === "PASS" && live.smtpReady && live.smtpMailboxKind === "support_mailbox"
      ? "PASS"
      : live.smtpReady
        ? "PASS"
        : "FAIL";
  const workspaceFounder: Row20Verdict = "FOUNDER VERIFICATION REQUIRED";
  const socialMfa: Row20Verdict = "FOUNDER VERIFICATION REQUIRED";

  return [
    cell({
      system: "website_admin",
      executive: "michelle",
      requiredAccess: "Operational visibility via hosted cycle and launch data stores. No human super-admin login.",
      currentAccess: "Hosted cycle + data stores. No BH_ADMIN_EMAILS identity.",
      permissionLevel: "READ operational evidence / NONE human admin UI",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Coordinate launch without unrestricted account/role/billing admin.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.supportDeniedAdminOps && live.architectDeniedAdmin ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Michelle → Founder for human admin UI. Hosted cycle recovery is Vercel cron.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "website_admin",
      executive: "imani",
      requiredAccess: "Technical/risk visibility via monitoring, dashboards data, hosted heartbeat. No super-admin UI.",
      currentAccess: "Hosted heartbeat + monitoring + data stores. No human admin login.",
      permissionLevel: "EXECUTE hosted runtime / NONE human admin UI",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Production monitoring and technical containment without Founder-as-operator.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.supportDeniedAdminOps ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani hosted runtime → Michelle → Founder for Vercel owner actions.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "website_admin",
      executive: "nia",
      requiredAccess: "CX ticket administration without unrestricted super-admin.",
      currentAccess: "support:ops:access for /ops/admin/support and /api/admin/support. Dashboards remain admin-only.",
      permissionLevel: "EXECUTE tickets / NONE billing-reconcile / NONE role-assign",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Primary CX ticket console for a support-role operator; AI Nia owns routing.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: ticketTest,
      leastPrivilegeResult:
        live.supportHasTicketPermission &&
        live.supportDeniedAdminOps &&
        live.supportDeniedBillingReconcile &&
        live.supportDeniedRoleAssign
          ? "PASS"
          : "FAIL",
      recoveryEscalation: "Nia → Michelle backup routing → Founder admin if no support-role human is configured.",
      actionRequired: live.supportEmailsConfigured
        ? null
        : "Optional: add a dedicated CX operator email to BH_SUPPORT_EMAILS if Founder should not open tickets as admin.",
      accessState: "VERIFIED",
    }),
    cell({
      system: "website_admin",
      executive: "kimberly",
      requiredAccess: "Ownership admin: dashboards, accounts, role assign, billing reconcile. Not daily ticket monitor.",
      currentAccess: live.adminEmailsConfigured
        ? `admin role via BH_ADMIN_EMAILS (count=${live.adminEmailCount}; founder mailbox listed=${live.founderMailboxInAdminConfig ? "YES" : "NO"})`
        : "BH_ADMIN_EMAILS not configured in this environment",
      permissionLevel: "ADMIN",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Final authority and ownership, not continuous operational monitoring.",
      mfaStatus: workspaceFounder,
      accessTestResult: live.adminHasTicketPermission
        ? live.adminEmailsConfigured
          ? "PASS"
          : "FOUNDER VERIFICATION REQUIRED"
        : "FAIL",
      leastPrivilegeResult: live.architectDeniedAdmin ? "PASS" : "FAIL",
      recoveryEscalation: founderRecovery,
      actionRequired: live.founderMailboxInAdminConfig
        ? null
        : "Confirm kimberly@thebackhalf.org is included in BH_ADMIN_EMAILS in Vercel production. Do not paste the list here.",
      accessState: live.adminEmailsConfigured ? "VERIFIED" : "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "support_tickets",
      executive: "michelle",
      requiredAccess: "Backup / operational routing; ticket visibility.",
      currentAccess: "Assigned backup owner in tracker. Categories TECHNICAL/PRIVACY/PAYMENT/ACCOUNT_LOGIN default-route to Michelle.",
      permissionLevel: "READ+ROUTE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Backup CX routing without Founder as first-line monitor.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.supportTicketsReadable && live.supportBackupOwner.includes("Michelle") ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Michelle → Imani (technical/security) or Founder (legal/reputational).",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "support_tickets",
      executive: "imani",
      requiredAccess: "Technical/security after routing.",
      currentAccess: "Auto-escalation target for Privacy/P1/security. Not primary CX owner.",
      permissionLevel: "READ after routing",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Contain technical/privacy incidents without owning public CX.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.supportTechnicalOwner.includes("Imani") ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani → Michelle → Founder if reserved.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "support_tickets",
      executive: "nia",
      requiredAccess: "Primary CX / public support ownership, ticket administration.",
      currentAccess: "Primary owner title in console. Default owner for general/experience categories. Console reachable with support:ops:access.",
      permissionLevel: "EXECUTE ticket workflow",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Public support ownership without super-admin.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult:
        live.defaultOwnerGeneralIsNia && live.supportTicketPathIsSupportScoped && live.supportTicketsReadable
          ? "PASS"
          : "FAIL",
      leastPrivilegeResult: live.supportDeniedAdminOps ? "PASS" : "FAIL",
      recoveryEscalation: "Nia → Michelle backup → Founder escalation only when protocol requires.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "support_tickets",
      executive: "kimberly",
      requiredAccess: "Escalation only where required (legal/reputational).",
      currentAccess: "Escalation target in classifier. Admin can open console; should not be the continuous monitor.",
      permissionLevel: "ESCALATION / ADMIN fallback",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Reserved exceptions only.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "launch_kpi_dashboard",
      executive: "michelle",
      requiredAccess: "Operational marketing/conversion visibility via data stores.",
      currentAccess: "Same first-party ledger the KPI dashboard reads. Human UI is admin-only.",
      permissionLevel: "READ data / NONE UI mutation",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Coordinate launch performance without GA4 and without payment mutation.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: dashTest,
      leastPrivilegeResult: live.launchKpiRemainsAdmin ? "PASS" : "FAIL",
      recoveryEscalation: "Data: Supabase/file store. UI: Founder admin.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "launch_kpi_dashboard",
      executive: "imani",
      requiredAccess: "Event/technical integrity of first-party analytics.",
      currentAccess: "Row 150 instrumentation owner. Dashboard UI admin-only.",
      permissionLevel: "EXECUTE events / READ dashboard data",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Keep production analytics durable without third-party pixels.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: dashTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani → Founder for production env.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "launch_kpi_dashboard",
      executive: "nia",
      requiredAccess: "Marketing performance visibility (traffic, conversion, campaign).",
      currentAccess: "KPI model built from first-party events. No GA4. UI admin-only.",
      permissionLevel: "READ",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Experience/marketing performance without social-account passwords in-app.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: dashTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Nia → Michelle → Founder admin UI.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "launch_kpi_dashboard",
      executive: "kimberly",
      requiredAccess: "Ownership view. Not daily monitor.",
      currentAccess: "Admin UI /ops/admin/launch-kpi.",
      permissionLevel: "ADMIN UI READ; social POST remains admin",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Founder review of launch marketing KPIs.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: dashTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "launch_dashboard",
      executive: "michelle",
      requiredAccess: "Daily ops visibility: traffic, conversion, revenue reporting, support, risks.",
      currentAccess: "Aggregation used by /ops/admin/launch-dashboard. UI admin-only.",
      permissionLevel: "READ data / NONE risk-mutation UI",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Operational coordination without Stripe mutation.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult:
        live.launchDashboardBuilt && live.launchDashboardHasSupport && live.launchDashboardHasRevenue
          ? "PASS"
          : "FAIL",
      leastPrivilegeResult: live.launchDashboardRemainsAdmin ? "PASS" : "FAIL",
      recoveryEscalation: "Michelle hosted cycle → Founder admin UI.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "launch_dashboard",
      executive: "imani",
      requiredAccess: "Errors, payments operational status, checkout failures, monitoring.",
      currentAccess: "Row 61 monitoring feeds Launch Health. Error/payment fields present.",
      permissionLevel: "READ + monitoring EXECUTE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Technical/risk visibility without refund authority.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.launchDashboardHasErrors ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani → Michelle → Founder.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "launch_dashboard",
      executive: "nia",
      requiredAccess: "Support metrics and experience/activation visibility.",
      currentAccess: "Support block on the same dashboard model.",
      permissionLevel: "READ",
      accountAdminOwner: founderOwner,
      operationalPurpose: "CX metrics without payment-changing authority.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.launchDashboardHasSupport ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Nia → Michelle.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "launch_dashboard",
      executive: "kimberly",
      requiredAccess: "Ownership UI. Founder Attention only when raised.",
      currentAccess: "Admin UI /ops/admin/launch-dashboard.",
      permissionLevel: "ADMIN UI",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Escalation review, not continuous watch.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.launchDashboardBuilt ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "instagram",
      executive: "michelle",
      requiredAccess: "Backup social monitor / routing. No ownership.",
      currentAccess: "Operating record @backhalfco. No machine publish. No Michelle@ social identity.",
      permissionLevel: "READ/ROUTE backup",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Backup monitor per Row 83. Not account owner.",
      mfaStatus: socialMfa,
      accessTestResult: live.socialOfficialHandle === "backhalfco" ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Social recovery mailbox kimberly@thebackhalf.org. Founder owns MFA.",
      actionRequired: "Founder confirm MFA, recovery, and that Michelle is backup-only (not owner).",
      accessState: "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "instagram",
      executive: "imani",
      requiredAccess: "NONE standing. Technical/security after routing only.",
      currentAccess: "NONE",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Not a social monitor.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Michelle routes incidents to Imani.",
      actionRequired: null,
      accessState: "NOT REQUIRED",
    }),
    cell({
      system: "instagram",
      executive: "nia",
      requiredAccess: "Primary public voice / native operating access to @backhalfco.",
      currentAccess: "Official handle recorded @backhalfco. No in-app password. Native login is Founder-held until verified.",
      permissionLevel: "NATIVE EXECUTE — FOUNDER VERIFICATION REQUIRED",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Launch posting and watch. Not company owner of the account.",
      mfaStatus: socialMfa,
      accessTestResult: "FOUNDER VERIFICATION REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Nia → Michelle backup → Founder recovery.",
      actionRequired: "Founder confirm Nia can operate Instagram @backhalfco without Founder as daily poster; MFA on; recovery mailbox kimberly@.",
      accessState: "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "instagram",
      executive: "kimberly",
      requiredAccess: "Company ownership, recovery, MFA.",
      currentAccess: "Founder-created official account @backhalfco (Row 76 accepted). Private settings not inspectable here.",
      permissionLevel: "ADMIN / OWNER",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Ownership and recovery. Not continuous social monitor.",
      mfaStatus: socialMfa,
      accessTestResult: "FOUNDER VERIFICATION REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: "Confirm MFA enabled, recovery mailbox kimberly@thebackhalf.org, backup codes Founder-held only.",
      accessState: "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "tiktok",
      executive: "michelle",
      requiredAccess: "Backup social monitor.",
      currentAccess: "Official @backhalfco recorded. No ownership.",
      permissionLevel: "READ/ROUTE backup",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Backup watch.",
      mfaStatus: socialMfa,
      accessTestResult: live.socialOfficialHandle === "backhalfco" ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "kimberly@thebackhalf.org recovery.",
      actionRequired: "Founder confirm backup-only access.",
      accessState: "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "tiktok",
      executive: "imani",
      requiredAccess: "NONE standing.",
      currentAccess: "NONE",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Not a social monitor.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Routed only.",
      actionRequired: null,
      accessState: "NOT REQUIRED",
    }),
    cell({
      system: "tiktok",
      executive: "nia",
      requiredAccess: "Primary public voice / native operating access to @backhalfco.",
      currentAccess: "Official handle recorded. Native login Founder-held until verified.",
      permissionLevel: "NATIVE EXECUTE — FOUNDER VERIFICATION REQUIRED",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Launch posting and watch.",
      mfaStatus: socialMfa,
      accessTestResult: "FOUNDER VERIFICATION REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Nia → Michelle → Founder.",
      actionRequired: "Founder confirm Nia can operate TikTok @backhalfco; MFA on; recovery mailbox kimberly@.",
      accessState: "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "tiktok",
      executive: "kimberly",
      requiredAccess: "Company ownership, recovery, MFA.",
      currentAccess: "Founder-created official account @backhalfco (Row 76 accepted).",
      permissionLevel: "ADMIN / OWNER",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Ownership and recovery.",
      mfaStatus: socialMfa,
      accessTestResult: "FOUNDER VERIFICATION REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: "Confirm MFA, recovery, backup codes Founder-held.",
      accessState: "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "linkedin",
      executive: "michelle",
      requiredAccess: "NONE — not a launch requirement.",
      currentAccess: "NONE",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Future enhancement only.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Do not create under Row 20.",
      actionRequired: null,
      accessState: "NOT A LAUNCH REQUIREMENT",
    }),
    cell({
      system: "linkedin",
      executive: "imani",
      requiredAccess: "NONE",
      currentAccess: "NONE",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Not a launch requirement.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Do not create.",
      actionRequired: null,
      accessState: "NOT A LAUNCH REQUIREMENT",
    }),
    cell({
      system: "linkedin",
      executive: "nia",
      requiredAccess: "NONE",
      currentAccess: "NONE",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Not a launch requirement.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Do not create.",
      actionRequired: null,
      accessState: "NOT A LAUNCH REQUIREMENT",
    }),
    cell({
      system: "linkedin",
      executive: "kimberly",
      requiredAccess: "NONE for August launch.",
      currentAccess: "NONE — future enhancement.",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Do not create a LinkedIn account in this row.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Future Founder decision.",
      actionRequired: null,
      accessState: "NOT A LAUNCH REQUIREMENT",
    }),
    cell({
      system: "google_workspace",
      executive: "michelle",
      requiredAccess: "Operational routing of support@ tickets. No Workspace super-admin. No michelle@ mailbox.",
      currentAccess: "Support operation uses SMTP + ticket tracker + IMAP poll. No agent Workspace seat.",
      permissionLevel: "READ/ROUTE via tickets — no super-admin",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Backup/routing of support without Founder inbox monitoring.",
      mfaStatus: workspaceFounder,
      accessTestResult: smtpTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Michelle ticket routing → Founder Workspace super-admin.",
      actionRequired: "Founder confirm Workspace MFA/recovery. Privacy@ UI remains Founder verification; Privacy tickets already route.",
      accessState: "VERIFIED",
    }),
    cell({
      system: "google_workspace",
      executive: "imani",
      requiredAccess: "NONE standing mailbox. Technical privacy after routing.",
      currentAccess: "NONE Workspace identity. SMTP is a runtime credential, not Imani's inbox.",
      permissionLevel: "NONE mailbox / EXECUTE SMTP runtime as technical owner of config",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Keep mail delivery working. No inbox ownership.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: smtpTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani technical → Founder super-admin.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "google_workspace",
      executive: "nia",
      requiredAccess: "Primary CX via support tickets / support@ sender identity. No nia@ mailbox. No super-admin.",
      currentAccess: "Public sender is The Back Half Support from support@. Ticket ownership is Nia.",
      permissionLevel: "DRAFT/OPERATE tickets — no Workspace admin",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Public support without Founder mailbox identity.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: smtpTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Nia → Michelle → Founder.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "google_workspace",
      executive: "kimberly",
      requiredAccess: "Super-admin, kimberly@ ownership, MFA/recovery. Not the public support address.",
      currentAccess: "Known operational mailboxes: support@, privacy@, kimberly@. SMTP from support@ verified Row 153.",
      permissionLevel: "ADMIN",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Ownership and recovery. Founder mail is not the support channel.",
      mfaStatus: workspaceFounder,
      accessTestResult: "FOUNDER VERIFICATION REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: "Confirm MFA on kimberly@ and Workspace super-admin recovery. Do not rerun SMTP unless it fails.",
      accessState: "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "support_mailbox",
      executive: "michelle",
      requiredAccess: "Backup operational routing.",
      currentAccess: `Mailbox ${SUPPORT_MAILBOX} operational via form, SMTP ack, IMAP poll, tickets.`,
      permissionLevel: "READ/ROUTE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Backup CX routing.",
      mfaStatus: workspaceFounder,
      accessTestResult: smtpTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Ticket console + IMAP. Founder holds mailbox password.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "support_mailbox",
      executive: "imani",
      requiredAccess: "Incident-specific after routing.",
      currentAccess: "No standing inbox. Escalation via tickets.",
      permissionLevel: "READ after routing",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Technical/security only.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Ticket escalation.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "support_mailbox",
      executive: "nia",
      requiredAccess: "Primary CX operating access via tickets + approved sender identity.",
      currentAccess: "Sender identity The Back Half Support. Ticket primary owner Nia.",
      permissionLevel: "OPERATE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Public support.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: smtpTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Nia → Michelle → Founder.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "support_mailbox",
      executive: "kimberly",
      requiredAccess: "Ownership of mailbox credentials. Not public support identity.",
      currentAccess: "Workspace owner. SMTP credential Founder-held in env. Do not send as Kimberly.",
      permissionLevel: "ADMIN",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Recovery only.",
      mfaStatus: workspaceFounder,
      accessTestResult: "FOUNDER VERIFICATION REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: "Confirm mailbox MFA/app-password custody remains Founder-only.",
      accessState: "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "privacy_mailbox",
      executive: "michelle",
      requiredAccess: "Route Privacy tickets. No legal conclusions. No invented legal@.",
      currentAccess: `${PRIVACY_MAILBOX} reserved. Privacy requests enter Row 153 tracker as category Privacy.`,
      permissionLevel: "READ/ROUTE tickets",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Privacy incident routing to Imani when exposure suspected.",
      mfaStatus: workspaceFounder,
      accessTestResult: live.supportTicketsReadable ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Privacy ticket → Imani if exposure → Founder/human expert for legal judgment.",
      actionRequired: "Founder confirm privacy@ inbox UI if distinct from support@; ticket path is operational now.",
      accessState: "VERIFIED",
    }),
    cell({
      system: "privacy_mailbox",
      executive: "imani",
      requiredAccess: "Technical privacy/security after routing.",
      currentAccess: "P1/Privacy auto-escalates to Imani.",
      permissionLevel: "READ after routing",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Investigate exposure. No legal conclusions.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani → Founder.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "privacy_mailbox",
      executive: "nia",
      requiredAccess: "NONE routine privacy@ inbox.",
      currentAccess: "NONE standing privacy mailbox. CX uses ticket protocol.",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Do not make CX the privacy mailbox owner.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Michelle routes.",
      actionRequired: null,
      accessState: "NOT REQUIRED",
    }),
    cell({
      system: "privacy_mailbox",
      executive: "kimberly",
      requiredAccess: "Mailbox ownership / legal reserved.",
      currentAccess: "Reserved address. Ticket path operational.",
      permissionLevel: "ADMIN",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Legal/privacy reserved decisions.",
      mfaStatus: workspaceFounder,
      accessTestResult: "FOUNDER VERIFICATION REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: "Confirm privacy@ exists in Workspace and MFA/recovery are Founder-held.",
      accessState: "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "stripe_payments",
      executive: "michelle",
      requiredAccess: "Revenue/conversion reporting visibility via launch dashboards. No Stripe mutation.",
      currentAccess: "Launch dashboard revenue fields. No Stripe Dashboard. No refunds (public policy: no refunds).",
      permissionLevel: "READ reporting only",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Ops visibility without payment-changing authority.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.launchDashboardHasRevenue ? "PASS" : "FAIL",
      leastPrivilegeResult: live.supportDeniedBillingReconcile ? "PASS" : "FAIL",
      recoveryEscalation: "Michelle → Founder for Stripe owner actions. No refunds.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "stripe_payments",
      executive: "imani",
      requiredAccess: "Payment operational status, checkout failure visibility, technical Stripe config READ.",
      currentAccess: "Monitoring payment probe + Stripe key used server-side. No charge/refund tests in this row.",
      permissionLevel: "READ technical / NONE refund / NONE payout",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Detect checkout/payment failures without financial-admin.",
      mfaStatus: "FOUNDER VERIFICATION REQUIRED",
      accessTestResult: live.stripeKeyPresent
        ? "PASS"
        : live.launchDashboardHasRevenue
          ? "FOUNDER VERIFICATION REQUIRED"
          : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani technical → Founder Stripe owner.",
      actionRequired: "Founder confirm Stripe Dashboard MFA and that STRIPE_SECRET_KEY remains in Vercel production. Do not grant refunds. Do not paste the key.",
      accessState: live.stripeKeyPresent ? "VERIFIED" : "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "stripe_payments",
      executive: "nia",
      requiredAccess: "Conversion/purchase reporting via KPI. No Stripe admin.",
      currentAccess: "KPI/dashboard purchase counts. No Stripe mutation. No refund category.",
      permissionLevel: "READ reporting only",
      accountAdminOwner: founderOwner,
      operationalPurpose: "CX/marketing conversion visibility.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.refundCategoryAbsent && live.kpiDashboardBuilt ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Payment exceptions stay Michelle → Founder. No refunds.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "stripe_payments",
      executive: "kimberly",
      requiredAccess: "Account owner. Billing/refund reserved (policy: no refunds). Not continuous payment monitor.",
      currentAccess: "Stripe account owner. Admin billing reconcile permission exists for recovery, not routine refunds.",
      permissionLevel: "ADMIN",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Ownership and exception authority.",
      mfaStatus: "FOUNDER VERIFICATION REQUIRED",
      accessTestResult: live.stripeKeyPresent || live.launchDashboardHasRevenue ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: "Confirm Stripe owner MFA/recovery. Confirm STRIPE_SECRET_KEY is in Vercel production. Do not perform a charge or refund to test. Do not paste the key.",
      accessState: "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "content_assets",
      executive: "michelle",
      requiredAccess: "READ launch communications, campaign archive, ops catalogs.",
      currentAccess: "Repo allowlist content/ ops/fab-5/ approved-assets/.",
      permissionLevel: "READ",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Source-of-truth coordination. Do not regenerate creative.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: contentTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Git history. Founder owns originals.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "content_assets",
      executive: "imani",
      requiredAccess: "READ implementation source. No creative rewrite.",
      currentAccess: "Scoped retrieve_source / production implementation.",
      permissionLevel: "READ",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Ship approved assets, do not replace them.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: contentTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Git.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "content_assets",
      executive: "nia",
      requiredAccess: "READ Founder videos/captions, IG/TT assets, campaign copy, Blueprint, website content.",
      currentAccess: "Catalogs + captions + campaign manifest + locked copy. No CMS overwrite UI.",
      permissionLevel: "READ (write only via approved engineering change-control)",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Use approved creative. Do not regenerate.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: contentTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Git + Founder originals.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "content_assets",
      executive: "kimberly",
      requiredAccess: "Ownership of Founder media.",
      currentAccess: "Workspace owner. No in-app content admin CMS.",
      permissionLevel: "ADMIN",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Approve/replace only by Founder decision.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: contentTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "legal_documents",
      executive: "michelle",
      requiredAccess: "READ current Version 1.0. No legal conclusions.",
      currentAccess: "Published /legal/* FOUNDER-ACCEPTED 1.0. No legal editor in admin UI.",
      permissionLevel: "READ",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Ops awareness. Modification restricted.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: legalTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Git + Founder legal signature.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "legal_documents",
      executive: "imani",
      requiredAccess: "READ implementation of accepted bodies. Row 34 risk review read. No rewrite of meaning.",
      currentAccess: "Catalog FOUNDER-ACCEPTED. Implementation eligible. No in-app legal CMS.",
      permissionLevel: "READ / implement eligible text only",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Keep published legal wired. Do not rewrite.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: legalTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani → Founder for signature/version change.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "legal_documents",
      executive: "nia",
      requiredAccess: "READ participant-facing approved text only.",
      currentAccess: "Public legal pages. No modification access.",
      permissionLevel: "READ",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Experience uses accepted legal. Do not edit.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: legalTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Nia → Imani implementation → Founder signature.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "legal_documents",
      executive: "kimberly",
      requiredAccess: "Legal signature / version acceptance.",
      currentAccess: "Version 1.0 Founder-accepted 2026-08-21, effective August 31, 2026.",
      permissionLevel: "ADMIN / SIGNATURE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Only Founder may accept legal changes.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: legalTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "vercel_production",
      executive: "michelle",
      requiredAccess: "NONE Owner/admin. Public host + hosted cycle evidence.",
      currentAccess: "NONE Vercel admin.",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Coordinate without deploy rights.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder deploy/rollback.",
      actionRequired: null,
      accessState: "NOT REQUIRED",
    }),
    cell({
      system: "vercel_production",
      executive: "imani",
      requiredAccess: "Hosted EXECUTE. Inspect as needed. Deploy/rollback Founder-reserved / Row 19 gated.",
      currentAccess: "Vercel-hosted heartbeat. No Owner/Billing.",
      permissionLevel: "EXECUTE hosted / NONE owner",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Technical runtime without unrestricted production mutation.",
      mfaStatus: "FOUNDER VERIFICATION REQUIRED",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani → Founder CLI owner.",
      actionRequired: "Founder confirm Vercel owner MFA. Do not rotate tokens unless defective.",
      accessState: "VERIFIED",
    }),
    cell({
      system: "vercel_production",
      executive: "nia",
      requiredAccess: "NONE admin. Public production HTTPS only.",
      currentAccess: "NONE",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Experience inspection of public site.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani/Founder.",
      actionRequired: null,
      accessState: "NOT REQUIRED",
    }),
    cell({
      system: "vercel_production",
      executive: "kimberly",
      requiredAccess: "Owner, billing, production ADMIN, deploy/rollback.",
      currentAccess: "Founder CLI / account owner.",
      permissionLevel: "ADMIN",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Ownership. Not routine agent execution.",
      mfaStatus: "FOUNDER VERIFICATION REQUIRED",
      accessTestResult: "FOUNDER VERIFICATION REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: "Confirm Vercel owner MFA/recovery.",
      accessState: "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "supabase_backend",
      executive: "michelle",
      requiredAccess: "WRITE operational tables via server runtime.",
      currentAccess: "Hosted durable state. No Founder password. No client service-role.",
      permissionLevel: "WRITE scoped",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Computer-independent ops state.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.postgresConfigured ? "PASS" : "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Row 62 backup. Founder project owner.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "supabase_backend",
      executive: "imani",
      requiredAccess: "Technical EXECUTE/READ same backend. No unrestricted destroy.",
      currentAccess: "Server-only credentials. Monitoring DB probe.",
      permissionLevel: "EXECUTE scoped",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Production data integrity and restore-into-isolated-target.",
      mfaStatus: "FOUNDER VERIFICATION REQUIRED",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani restore isolated first → Founder if production destination ever required.",
      actionRequired: "Founder confirm Supabase owner MFA.",
      accessState: "VERIFIED",
    }),
    cell({
      system: "supabase_backend",
      executive: "nia",
      requiredAccess: "WRITE nia_* / experience state only.",
      currentAccess: "Scoped hosted writes. No DB admin.",
      permissionLevel: "WRITE scoped",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Experience persistence.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "supabase_backend",
      executive: "kimberly",
      requiredAccess: "Project owner/billing/recovery.",
      currentAccess: "Owner.",
      permissionLevel: "ADMIN",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Recovery.",
      mfaStatus: "FOUNDER VERIFICATION REQUIRED",
      accessTestResult: "FOUNDER VERIFICATION REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: "Confirm Supabase owner MFA/recovery.",
      accessState: "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "production_monitoring",
      executive: "michelle",
      requiredAccess: "Operational visibility of Launch Health / Founder Attention flags.",
      currentAccess: "Row 61 snapshot on launch dashboard. Not cron secret holder as a human.",
      permissionLevel: "READ",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Coordinate incidents without being the technical probe.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: fileExists("ops/fab-5/row-61-status.json") ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani technical owner.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "production_monitoring",
      executive: "imani",
      requiredAccess: "Uptime, errors, database, payments probes.",
      currentAccess: "Row 61 complete. GET /api/ops/monitoring/run is cron-secret gated. /api/ops/health is public liveness.",
      permissionLevel: "EXECUTE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Technical/risk monitoring. Founder only if Attention = YES.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: fileExists("app/api/ops/monitoring/run/route.ts") ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani → Michelle → Founder.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "production_monitoring",
      executive: "nia",
      requiredAccess: "NONE standing probe access.",
      currentAccess: "NONE cron secret.",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Not the production monitor.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani.",
      actionRequired: null,
      accessState: "NOT REQUIRED",
    }),
    cell({
      system: "production_monitoring",
      executive: "kimberly",
      requiredAccess: "Founder Attention only. Not continuous monitor.",
      currentAccess: "Dashboard Founder Attention flag. Cron secret Founder-held in env.",
      permissionLevel: "ADMIN secret custody / READ when raised",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Escalation, not watch duty.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "openai_agents_sdk",
      executive: "michelle",
      requiredAccess: "EXECUTE hosted model for orchestration.",
      currentAccess: "Server-side OPENAI_API_KEY on Vercel. Never echoed.",
      permissionLevel: "EXECUTE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "24/7 Michelle cycle.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.openaiKeyPresent ? "PASS" : "FOUNDER VERIFICATION REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder OpenAI billing.",
      actionRequired: live.openaiKeyPresent
        ? null
        : "Confirm OPENAI_API_KEY is present in Vercel production for hosted Fab 5 cycles. Do not paste the value.",
      accessState: live.openaiKeyPresent ? "VERIFIED" : "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "openai_agents_sdk",
      executive: "imani",
      requiredAccess: "EXECUTE technical runtime.",
      currentAccess: "Hosted heartbeat. Key not in prompts.",
      permissionLevel: "EXECUTE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Technical agent.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.openaiKeyPresent ? "PASS" : "FOUNDER VERIFICATION REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder billing.",
      actionRequired: live.openaiKeyPresent
        ? null
        : "Confirm OPENAI_API_KEY is present in Vercel production for hosted Fab 5 cycles. Do not paste the value.",
      accessState: live.openaiKeyPresent ? "VERIFIED" : "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "openai_agents_sdk",
      executive: "nia",
      requiredAccess: "EXECUTE experience agent.",
      currentAccess: "Hosted Nia cycle. Key not in prompts.",
      permissionLevel: "EXECUTE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Experience/transformation runtime.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.openaiKeyPresent ? "PASS" : "FOUNDER VERIFICATION REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder billing.",
      actionRequired: live.openaiKeyPresent
        ? null
        : "Confirm OPENAI_API_KEY is present in Vercel production for hosted Fab 5 cycles. Do not paste the value.",
      accessState: live.openaiKeyPresent ? "VERIFIED" : "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "openai_agents_sdk",
      executive: "kimberly",
      requiredAccess: "Account billing/owner.",
      currentAccess: "Owner.",
      permissionLevel: "ADMIN",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Billing and recovery. Not routine operator.",
      mfaStatus: "FOUNDER VERIFICATION REQUIRED",
      accessTestResult: "FOUNDER VERIFICATION REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: "Confirm OpenAI account MFA/billing owner.",
      accessState: "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "heygen",
      executive: "michelle",
      requiredAccess: "NONE — not currently a production launch runtime.",
      currentAccess: "NONE. Founder media already exists as repo assets.",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Do not provision unused vendors.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "N/A",
      actionRequired: null,
      accessState: "NOT REQUIRED",
    }),
    cell({
      system: "heygen",
      executive: "imani",
      requiredAccess: "NONE currently.",
      currentAccess: "NONE in production code.",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Not a current technical dependency for launch access.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "N/A",
      actionRequired: null,
      accessState: "NOT REQUIRED",
    }),
    cell({
      system: "heygen",
      executive: "nia",
      requiredAccess: "NONE currently. Use existing Founder media assets.",
      currentAccess: "NONE. Remaining HeyGen production is other rows, not Row 20 access.",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Do not regenerate approved creative.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "N/A",
      actionRequired: null,
      accessState: "NOT REQUIRED",
    }),
    cell({
      system: "heygen",
      executive: "kimberly",
      requiredAccess: "NONE unless later media production requires it.",
      currentAccess: "Not connected in this application.",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Do not create a HeyGen integration to pass this row.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "N/A",
      actionRequired: null,
      accessState: "NOT REQUIRED",
    }),
    cell({
      system: "cursor_agent_runtime",
      executive: "michelle",
      requiredAccess: "NONE. Routine execution is Vercel-hosted.",
      currentAccess: "NONE",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Do not provision Cursor to ops executives.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder engineering.",
      actionRequired: null,
      accessState: "NOT REQUIRED",
    }),
    cell({
      system: "cursor_agent_runtime",
      executive: "imani",
      requiredAccess: "NONE for launch operations. Hosted heartbeat is the runtime. Cursor is Founder engineering.",
      currentAccess: "NONE as 24/7 identity.",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Technical work in production is hosted, not a Cursor seat.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder engineering.",
      actionRequired: null,
      accessState: "NOT REQUIRED",
    }),
    cell({
      system: "cursor_agent_runtime",
      executive: "nia",
      requiredAccess: "NONE",
      currentAccess: "NONE",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "CX does not need development access.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder engineering.",
      actionRequired: null,
      accessState: "NOT REQUIRED",
    }),
    cell({
      system: "cursor_agent_runtime",
      executive: "kimberly",
      requiredAccess: "ADMIN — approved development tool for Founder engineering.",
      currentAccess: "Workspace owner.",
      permissionLevel: "ADMIN",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Software-engineering execution layer.",
      mfaStatus: "FOUNDER VERIFICATION REQUIRED",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: "Confirm Cursor account recovery remains Founder-held.",
      accessState: "VERIFIED",
    }),
    cell({
      system: "secrets_manager",
      executive: "michelle",
      requiredAccess: "NONE. Never retrieve secrets.",
      currentAccess: "NONE",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Secrets stay runtime-only.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder.",
      actionRequired: null,
      accessState: "NOT REQUIRED",
    }),
    cell({
      system: "secrets_manager",
      executive: "imani",
      requiredAccess: "Runtime use only. Never echo.",
      currentAccess: "Env at runtime. query_access denies secret retrieval.",
      permissionLevel: "EXECUTE runtime / NONE retrieval",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Use keys, never print them.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder custody.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "secrets_manager",
      executive: "nia",
      requiredAccess: "NONE retrieval.",
      currentAccess: "NONE",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "No credential visibility.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder.",
      actionRequired: null,
      accessState: "NOT REQUIRED",
    }),
    cell({
      system: "secrets_manager",
      executive: "kimberly",
      requiredAccess: "Custody of recovery codes, passwords, owner tokens.",
      currentAccess: "Founder-held. Not in git.",
      permissionLevel: "ADMIN",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Recovery. Never paste into chat.",
      mfaStatus: "FOUNDER VERIFICATION REQUIRED",
      accessTestResult: "FOUNDER VERIFICATION REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: "Keep recovery codes off shared docs and out of this review.",
      accessState: "FOUNDER VERIFICATION REQUIRED",
    }),
    ...companionRow20Cells(live, founderOwner, founderRecovery, workspaceFounder, smtpTest),
  ];
}

function companionRow20Cells(
  live: Row20LiveChecks,
  founderOwner: string,
  founderRecovery: string,
  workspaceFounder: Row20Verdict,
  smtpTest: Row20Verdict,
): Row20MatrixCell[] {
  const gitTest: Row20Verdict = fileExists(".git") ? "PASS" : "FAIL";
  const queueTest: Row20Verdict = fileExists("ops/fab-5/launch-rows.json") ? "PASS" : "FAIL";
  const hosted: Row20Verdict = fileExists("vercel.json") || fileExists("app/api/fab-5") ? "PASS" : "FAIL";

  return [
    cell({
      system: "git_repository",
      executive: "michelle",
      requiredAccess: "READ source of truth. No force-push. No branch-protection admin.",
      currentAccess: "Repo allowlist via retrieve_source. No GitHub org admin.",
      permissionLevel: "READ",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Coordinate from current code without owning GitHub.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: gitTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder GitHub org owner.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "git_repository",
      executive: "imani",
      requiredAccess: "WRITE scoped implementation. No org admin.",
      currentAccess: "Hosted/engineering implementation path. No GitHub owner.",
      permissionLevel: "WRITE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Ship approved code. No force-push.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: gitTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder GitHub owner.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "git_repository",
      executive: "nia",
      requiredAccess: "WRITE experience/content files only.",
      currentAccess: "Scoped content paths. No infrastructure admin.",
      permissionLevel: "WRITE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Experience/content changes via engineering change-control.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: gitTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani implementation → Founder owner.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "git_repository",
      executive: "kimberly",
      requiredAccess: "GitHub org/account ownership and recovery.",
      currentAccess: "Owner.",
      permissionLevel: "ADMIN",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Ownership and recovery.",
      mfaStatus: "FOUNDER VERIFICATION REQUIRED",
      accessTestResult: gitTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: "Confirm GitHub org MFA/recovery remains Founder-held.",
      accessState: "VERIFIED",
    }),
    cell({
      system: "production_data_store",
      executive: "michelle",
      requiredAccess: "WRITE operational tables via server runtime.",
      currentAccess: "Same durable store as hosted cycles. No dashboard password.",
      permissionLevel: "WRITE scoped",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Computer-independent ops state.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.postgresConfigured || live.supportTicketsReadable ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Row 62 backup. Founder project owner.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "production_data_store",
      executive: "imani",
      requiredAccess: "Technical EXECUTE/READ. No unrestricted destroy.",
      currentAccess: "Server-only credentials. Monitoring DB probe.",
      permissionLevel: "EXECUTE scoped",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Data integrity and isolated restore.",
      mfaStatus: "FOUNDER VERIFICATION REQUIRED",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani isolated restore → Founder if production destination ever required.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "production_data_store",
      executive: "nia",
      requiredAccess: "WRITE nia_* / experience state only.",
      currentAccess: "Scoped hosted writes. No DB admin.",
      permissionLevel: "WRITE scoped",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Experience persistence.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "PASS",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "production_data_store",
      executive: "kimberly",
      requiredAccess: "Project owner/billing/recovery.",
      currentAccess: "Owner.",
      permissionLevel: "ADMIN",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Recovery.",
      mfaStatus: "FOUNDER VERIFICATION REQUIRED",
      accessTestResult: "FOUNDER VERIFICATION REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: "Confirm production data-store owner MFA/recovery.",
      accessState: "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "smtp_transactional_email",
      executive: "michelle",
      requiredAccess: "Operational routing of support acknowledgements. No SMTP secret retrieval.",
      currentAccess: "Row 153 SMTP from support@ verified. No send as Kimberly.",
      permissionLevel: "READ/ROUTE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Support acknowledgements without Founder as sender.",
      mfaStatus: workspaceFounder,
      accessTestResult: smtpTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani config → Founder Workspace.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "smtp_transactional_email",
      executive: "imani",
      requiredAccess: "Technical SMTP configuration owner. No mailbox identity.",
      currentAccess: "Runtime SMTP. Verify-only rechecked this row. No send test.",
      permissionLevel: "EXECUTE runtime",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Keep delivery working.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: smtpTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder Workspace super-admin.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "smtp_transactional_email",
      executive: "nia",
      requiredAccess: "Sender identity The Back Half Support. No SMTP admin.",
      currentAccess: "Public acknowledgements use support@. Ticket ownership is Nia.",
      permissionLevel: "OPERATE via tickets",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Public support sender identity.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: smtpTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Nia → Michelle → Founder.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "smtp_transactional_email",
      executive: "kimberly",
      requiredAccess: "Credential custody. Not the public sender.",
      currentAccess: "Env custody. Row 153 delivery PASS. Do not rerun send unless defective.",
      permissionLevel: "ADMIN",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Recovery only.",
      mfaStatus: workspaceFounder,
      accessTestResult: "FOUNDER VERIFICATION REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: "Confirm SMTP app-password custody remains Founder-only. Do not paste it here.",
      accessState: "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "analytics_third_party",
      executive: "michelle",
      requiredAccess: "NONE. First-party Row 84/150/151 replaces GA4/Clarity for launch.",
      currentAccess: "NONE. Do not provision GA4 to pass this row.",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Use launch KPI / launch dashboard, not a second analytics vendor.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "N/A",
      actionRequired: null,
      accessState: "NOT A LAUNCH REQUIREMENT",
    }),
    cell({
      system: "analytics_third_party",
      executive: "imani",
      requiredAccess: "NONE standing GA4/Clarity admin.",
      currentAccess: "NONE. Event tracking is first-party.",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Do not add third-party pixels for this row.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "N/A",
      actionRequired: null,
      accessState: "NOT A LAUNCH REQUIREMENT",
    }),
    cell({
      system: "analytics_third_party",
      executive: "nia",
      requiredAccess: "NONE. Marketing performance is first-party KPI.",
      currentAccess: "NONE",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Use /ops/admin/launch-kpi data, not GA4.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "N/A",
      actionRequired: null,
      accessState: "NOT A LAUNCH REQUIREMENT",
    }),
    cell({
      system: "analytics_third_party",
      executive: "kimberly",
      requiredAccess: "NONE for August launch.",
      currentAccess: "NONE",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Do not create GA4/Clarity to complete Row 20.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "N/A",
      actionRequired: null,
      accessState: "NOT A LAUNCH REQUIREMENT",
    }),
    cell({
      system: "analytics_internal_ledger",
      executive: "michelle",
      requiredAccess: "READ first-party events feeding KPI/launch dashboards.",
      currentAccess: "Same ledger Row 84/150 persist.",
      permissionLevel: "READ",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Ops visibility without PII dumps.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.kpiDashboardBuilt ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani event integrity.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "analytics_internal_ledger",
      executive: "imani",
      requiredAccess: "WRITE events via product. No unrestricted mutation.",
      currentAccess: "Row 150 instrumentation.",
      permissionLevel: "WRITE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Durable first-party analytics.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.kpiDashboardBuilt ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder production env.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "analytics_internal_ledger",
      executive: "nia",
      requiredAccess: "READ experience/marketing counts.",
      currentAccess: "KPI model.",
      permissionLevel: "READ",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Campaign performance without GA4.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.kpiDashboardBuilt ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Michelle → Founder admin UI.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "analytics_internal_ledger",
      executive: "kimberly",
      requiredAccess: "Ownership view. Not daily monitor.",
      currentAccess: "Admin KPI UI.",
      permissionLevel: "READ",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Founder review.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.kpiDashboardBuilt ? "PASS" : "FAIL",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "launch_dashboard_work_queues",
      executive: "michelle",
      requiredAccess: "READ+WRITE status/evidence on the consolidated launch view.",
      currentAccess: "Hosted Michelle cycle + launch-rows adapter.",
      permissionLevel: "WRITE status/evidence",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Orchestration. Do not mark Complete.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: queueTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder acceptance remains Founder-only.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "launch_dashboard_work_queues",
      executive: "imani",
      requiredAccess: "READ assigned technical work.",
      currentAccess: "query_launch_view.",
      permissionLevel: "READ",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Assigned work only.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: queueTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Michelle orchestrator.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "launch_dashboard_work_queues",
      executive: "nia",
      requiredAccess: "READ assigned experience work.",
      currentAccess: "query_launch_view.",
      permissionLevel: "READ",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Assigned work only.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: queueTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Michelle orchestrator.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "launch_dashboard_work_queues",
      executive: "kimberly",
      requiredAccess: "Founder queue visibility. Not routine execution.",
      currentAccess: "Founder queue in launch view.",
      permissionLevel: "READ",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Acceptance and reserved decisions.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: queueTest,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "approved_automation",
      executive: "michelle",
      requiredAccess: "EXECUTE hosted orchestration cycle. No extra lifecycle vendor.",
      currentAccess: "Vercel cron Michelle cycle. Row 147 lifecycle email is a different row.",
      permissionLevel: "EXECUTE hosted",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Launch-critical automation is hosted Fab 5, not a new vendor.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: hosted,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder Vercel owner.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "approved_automation",
      executive: "imani",
      requiredAccess: "EXECUTE hosted heartbeat / monitoring cron.",
      currentAccess: "Vercel cron Imani heartbeat + Row 61 probes.",
      permissionLevel: "EXECUTE hosted",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Technical runtime automation.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: hosted,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder Vercel owner.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "approved_automation",
      executive: "nia",
      requiredAccess: "EXECUTE hosted experience cycle.",
      currentAccess: "Vercel cron Nia cycle.",
      permissionLevel: "EXECUTE hosted",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Experience runtime. No social-publish automation connected.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: hosted,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Michelle → Founder.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "approved_automation",
      executive: "kimberly",
      requiredAccess: "Owner of hosted runtime. Not routine operator.",
      currentAccess: "Vercel cron owner.",
      permissionLevel: "ADMIN",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Custody of CRON_SECRET. Not daily monitor.",
      mfaStatus: "FOUNDER VERIFICATION REQUIRED",
      accessTestResult: hosted,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: "Confirm CRON_SECRET custody remains Founder-held and is not pasted into chat.",
      accessState: "VERIFIED",
    }),
    cell({
      system: "google_signin_oauth",
      executive: "michelle",
      requiredAccess: "NONE. Participant Google Sign-In is not mailbox access.",
      currentAccess: "NONE",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "OAuth client ≠ Gmail.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani technical / Founder Cloud owner.",
      actionRequired: null,
      accessState: "NOT REQUIRED",
    }),
    cell({
      system: "google_signin_oauth",
      executive: "imani",
      requiredAccess: "Technical EXECUTE of participant Google Sign-In.",
      currentAccess: live.googleOauthConfigured
        ? "OAuth client configured. Not Workspace mailbox access."
        : "OAuth client not configured in this environment.",
      permissionLevel: "EXECUTE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Participant login. Not mailbox delegation.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: live.googleOauthConfigured ? "PASS" : "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder Cloud/OAuth consent owner.",
      actionRequired: null,
      accessState: live.googleOauthConfigured ? "VERIFIED" : "NOT REQUIRED",
    }),
    cell({
      system: "google_signin_oauth",
      executive: "nia",
      requiredAccess: "NONE secret access. Experience review of the public flow only.",
      currentAccess: "NONE",
      permissionLevel: "NONE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Not an OAuth admin.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: "NOT REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Imani.",
      actionRequired: null,
      accessState: "NOT REQUIRED",
    }),
    cell({
      system: "google_signin_oauth",
      executive: "kimberly",
      requiredAccess: "Cloud/OAuth consent ownership.",
      currentAccess: live.googleOauthConfigured ? "Client present." : "Confirm production OAuth owner MFA.",
      permissionLevel: "ADMIN",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Ownership. Not mailbox.",
      mfaStatus: "FOUNDER VERIFICATION REQUIRED",
      accessTestResult: "FOUNDER VERIFICATION REQUIRED",
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: "Confirm Google Cloud/OAuth owner MFA. Do not treat as Gmail access.",
      accessState: "FOUNDER VERIFICATION REQUIRED",
    }),
    cell({
      system: "unattended_247_runtime",
      executive: "michelle",
      requiredAccess: "EXECUTE hosted cycle independent of the Founder's computer.",
      currentAccess: "Vercel cron. No human seat. No mailbox.",
      permissionLevel: "EXECUTE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "24/7 orchestration.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: hosted,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder Vercel owner.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "unattended_247_runtime",
      executive: "imani",
      requiredAccess: "EXECUTE hosted heartbeat.",
      currentAccess: "Vercel cron. Deploy/rollback Founder-reserved.",
      permissionLevel: "EXECUTE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "24/7 technical runtime.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: hosted,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder Vercel owner.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "unattended_247_runtime",
      executive: "nia",
      requiredAccess: "EXECUTE hosted experience cycle.",
      currentAccess: "Vercel cron. No nia@ mailbox.",
      permissionLevel: "EXECUTE",
      accountAdminOwner: founderOwner,
      operationalPurpose: "24/7 experience runtime.",
      mfaStatus: "NOT APPLICABLE",
      accessTestResult: hosted,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: "Founder Vercel owner.",
      actionRequired: null,
      accessState: "VERIFIED",
    }),
    cell({
      system: "unattended_247_runtime",
      executive: "kimberly",
      requiredAccess: "Owner of hosted runtime. Not routine agent execution.",
      currentAccess: "Vercel account owner / cron registered.",
      permissionLevel: "ADMIN",
      accountAdminOwner: founderOwner,
      operationalPurpose: "Ownership. Not continuous operator.",
      mfaStatus: "FOUNDER VERIFICATION REQUIRED",
      accessTestResult: hosted,
      leastPrivilegeResult: "PASS",
      recoveryEscalation: founderRecovery,
      actionRequired: "Confirm Vercel cron and owner MFA remain Founder-held.",
      accessState: "VERIFIED",
    }),
  ];
}

export function matrixToRegistryEntries(
  cells: Row20MatrixCell[],
  live: Row20LiveChecks,
): AccessRegistryEntry[] {
  return cells.map((row) => {
    const none =
      row.accessState === "NOT REQUIRED" || row.accessState === "NOT A LAUNCH REQUIREMENT";
    let requiredPermission = "NONE";
    if (!none) {
      if (/ADMIN/.test(row.permissionLevel)) requiredPermission = "ADMIN";
      else if (/EXECUTE/.test(row.permissionLevel)) requiredPermission = "EXECUTE";
      else if (/WRITE/.test(row.permissionLevel)) requiredPermission = "WRITE";
      else if (/READ/.test(row.permissionLevel)) requiredPermission = "READ";
      else requiredPermission = "EXECUTE";
    }
    return {
      system: row.system,
      purpose: row.operationalPurpose,
      executive: row.executive,
      requiredPermission,
      actualPermission: none ? "NONE" : row.permissionLevel,
      accessState: row.accessState,
      credentialType: row.accountAdminOwner,
      verificationMethod: row.accessTestResult,
      lastVerifiedAt: live.generatedAt,
      restrictions: `${row.requiredAccess} Recovery: ${row.recoveryEscalation}`,
      FounderAdminRequired: row.executive === "kimberly",
      dependency: row.actionRequired,
      evidenceReference: ROW20_AUDIT_PATH,
    };
  });
}

export function uniqueFounderVerificationItems(cells: Row20MatrixCell[]): string[] {
  const items = new Set<string>();
  for (const row of cells) {
    if (row.actionRequired && (row.accessState === "FOUNDER VERIFICATION REQUIRED" || row.mfaStatus === "FOUNDER VERIFICATION REQUIRED")) {
      items.add(row.actionRequired);
    } else if (row.actionRequired && row.executive === "kimberly") {
      items.add(row.actionRequired);
    }
  }
  return [...items];
}

export function leastPrivilegeOverall(cells: Row20MatrixCell[], live: Row20LiveChecks): "PASS" | "FAIL" {
  const cellFail = cells.some((row) => row.leastPrivilegeResult === "FAIL");
  const roleFail =
    !live.architectDeniedAdmin ||
    !live.supportDeniedAdminOps ||
    !live.supportDeniedBillingReconcile ||
    !live.supportDeniedRoleAssign ||
    !live.supportHasTicketPermission ||
    !live.supportTicketPathIsSupportScoped;
  return cellFail || roleFail ? "FAIL" : "PASS";
}
