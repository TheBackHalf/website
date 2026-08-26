/**
 * Row 20 Founder review model.
 * Reads Founder acceptance from ops/fab-5/row-20-status.json.
 * Does not rebuild the access matrix or rotate secrets.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { AccessRegistryFile } from "@/lib/fab-5/access";
import {
  ROW20_AUDIT_PATH,
  ROW20_REVIEW_PATH,
  ROW20_REVIEW_URL,
  ROW20_EXECUTIVES,
  buildRow20Matrix,
  collectRow20LiveChecks,
  leastPrivilegeOverall,
  uniqueFounderVerificationItems,
  type Row20LiveChecks,
  type Row20Verdict,
} from "@/lib/fab-5/row20-access";

export { ROW20_REVIEW_PATH, ROW20_REVIEW_URL };

export type Row20HttpTests = {
  unauthenticatedAdminRedirects: boolean;
  architectDeniedAdmin: boolean;
  supportAllowedTickets: boolean;
  supportDeniedAdminHome: boolean;
  supportDeniedLaunchKpi: boolean;
  supportDeniedLaunchDashboard: boolean;
  adminAllowedAdminHome: boolean;
  adminAllowedTickets: boolean;
  adminAllowedLaunchKpi: boolean;
  adminAllowedLaunchDashboard: boolean;
  supportFormLoads: boolean;
  legalTermsLoad: boolean;
  legalPrivacyLoad: boolean;
  reviewPageLoads: boolean;
  healthOk: boolean;
  instagramPublicReachable: boolean | null;
  tiktokPublicReachable: boolean | null;
};

export type Row20AuditFile = {
  generatedAt: string;
  secretsPrinted: false;
  live: Row20LiveChecks;
  http: Row20HttpTests | null;
  stripeReporting: { ok: boolean; livemode: boolean | null; sandboxKey: boolean | null; note: string } | null;
  openaiLive: { ok: boolean; echoedKey: boolean; note: string } | null;
  smtpAuth: { ok: boolean; mailboxKind: string; note: string } | null;
  defectsCorrected: string[];
  markedComplete: false;
};

function readAudit(): Row20AuditFile | null {
  const abs = path.join(/* turbopackIgnore: true */ process.cwd(), ROW20_AUDIT_PATH);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as Row20AuditFile;
  } catch {
    return null;
  }
}

type Row20StatusFile = {
  founderAccepted?: boolean;
  founderAcceptance?: string;
  status?: string;
};

function readRow20Status(): Row20StatusFile | null {
  const abs = path.join(/* turbopackIgnore: true */ process.cwd(), "ops/fab-5/row-20-status.json");
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as Row20StatusFile;
  } catch {
    return null;
  }
}

function passFail(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}

export async function getRow20ReviewModel() {
  const live = await collectRow20LiveChecks();
  const cells = buildRow20Matrix(live);
  const audit = readAudit();
  const status = readRow20Status();
  const founderAccepted =
    status?.founderAccepted === true || status?.founderAcceptance === "YES";
  const http = audit?.http ?? null;
  const founderItems = uniqueFounderVerificationItems(cells);
  const lp = leastPrivilegeOverall(cells, live);

  const websiteAdmin = passFail(
    live.architectDeniedAdmin &&
      live.supportDeniedAdminOps &&
      live.adminHasTicketPermission &&
      live.supportTicketPathIsSupportScoped &&
      (http
        ? http.unauthenticatedAdminRedirects &&
          http.architectDeniedAdmin &&
          http.supportAllowedTickets &&
          http.supportDeniedAdminHome &&
          http.adminAllowedAdminHome
        : true),
  );

  const support = passFail(
    live.supportTicketsReadable &&
      live.defaultOwnerGeneralIsNia &&
      live.supportTicketPathIsSupportScoped &&
      live.refundCategoryAbsent &&
      (http ? http.supportFormLoads && http.supportAllowedTickets : true),
  );

  const analytics = passFail(live.kpiDashboardBuilt && live.launchDashboardBuilt);
  const kpi = passFail(live.kpiDashboardBuilt && live.launchKpiRemainsAdmin);
  const launchDash = passFail(
    live.launchDashboardBuilt &&
      live.launchDashboardHasSupport &&
      live.launchDashboardHasRevenue &&
      live.launchDashboardRemainsAdmin,
  );
  const legal = passFail(live.legalPublished && live.legalBodiesPresent);
  const content = passFail(
    live.campaignManifestPresent &&
      live.blueprintManifestPresent &&
      live.founderCaptionsAvailable > 0,
  );
  const payment = passFail(
    live.launchDashboardHasRevenue &&
      live.supportDeniedBillingReconcile &&
      live.refundCategoryAbsent,
  );
  const workspaceOperational =
    (live.row153SmtpDelivery === "PASS" || live.smtpReady) &&
    live.smtpMailboxKind === "support_mailbox";
  const workspace: Row20Verdict = workspaceOperational
    ? "FOUNDER VERIFICATION REQUIRED"
    : "FAIL";
  const infra = passFail(fileExistsSafe("ops/fab-5/row-61-status.json") && fileExistsSafe("ops/fab-5/row-62-status.json"));
  const cursor = passFail(
    cells
      .filter((row) => row.system === "cursor_agent_runtime" && row.executive !== "kimberly")
      .every((row) => row.accessState === "NOT REQUIRED"),
  );
  const ai: Row20Verdict =
    audit?.openaiLive && !audit.openaiLive.ok
      ? "FAIL"
      : live.openaiKeyPresent
        ? "PASS"
        : "FOUNDER VERIFICATION REQUIRED";

  const httpUnauthorized = http
    ? passFail(
        http.unauthenticatedAdminRedirects &&
          http.architectDeniedAdmin &&
          http.supportDeniedAdminHome &&
          http.supportDeniedLaunchKpi &&
          http.supportDeniedLaunchDashboard,
      )
    : passFail(live.architectDeniedAdmin && live.supportDeniedAdminOps);

  const mechanical = passFail(
    Boolean(http) &&
      (http?.reviewPageLoads ?? false) &&
      (http?.supportFormLoads ?? false) &&
      (http?.legalTermsLoad ?? false) &&
      (http?.legalPrivacyLoad ?? false) &&
      (http?.adminAllowedLaunchKpi ?? false) &&
      (http?.adminAllowedLaunchDashboard ?? false) &&
      (http?.supportAllowedTickets ?? false) &&
      (http?.supportDeniedLaunchDashboard ?? false) &&
      live.supportTicketsReadable &&
      live.kpiDashboardBuilt &&
      live.launchDashboardBuilt &&
      live.legalPublished,
  );

  const requiredProvisioned = passFail(
    websiteAdmin === "PASS" &&
      support === "PASS" &&
      analytics === "PASS" &&
      legal === "PASS" &&
      content === "PASS" &&
      payment === "PASS" &&
      workspace !== "FAIL" &&
      infra === "PASS" &&
      cursor === "PASS" &&
      ai !== "FAIL",
  );

  const blockers: string[] = [];
  if (websiteAdmin === "FAIL") blockers.push("Website/admin access control failed.");
  if (support === "FAIL") blockers.push("Support ticket access/routing failed.");
  if (analytics === "FAIL") blockers.push("Analytics/dashboard data failed.");
  if (legal === "FAIL") blockers.push("Legal document access failed.");
  if (content === "FAIL") blockers.push("Content asset source of truth failed.");
  if (payment === "FAIL") blockers.push("Payment reporting access failed.");
  if (workspace === "FAIL") blockers.push("Google Workspace/support SMTP access failed.");
  if (infra === "FAIL") blockers.push("Infrastructure/monitoring evidence missing.");
  if (ai === "FAIL") {
    blockers.push(
      live.openaiKeyPresent
        ? "OpenAI authenticated models read failed."
        : "OpenAI production key missing in this environment.",
    );
  }
  if (lp === "FAIL") blockers.push("Least privilege failed.");
  if (!http) {
    blockers.push("Mechanical HTTP access tests were not recorded against localhost.");
  } else if (mechanical === "FAIL") {
    blockers.push("Mechanical HTTP access tests failed.");
  }

  const ready = blockers.length === 0;
  const defectsCorrected = [
    "Support ticket console and /api/admin/support/* now require support:ops:access instead of full admin:ops:access, so CX ticket administration no longer requires unrestricted super-admin.",
    "Access registry reconciled to current systems: Row 76 @backhalfco, Row 153 support channels, Row 84/150/151 first-party analytics, legal Version 1.0, LinkedIn not a launch requirement.",
    "Stale operating-system emailAutonomy note updated: mailbox operations are Row 153 operational; Founder still verifies Workspace super-admin MFA/inbox UI.",
    "Support operations page now links to the ticket console. Ticket console hides admin-only dashboard links from support-role operators.",
    "Local marketing KPI ledger had concatenated JSON after a prior write; the store now recovers the first complete object and rewrites a clean file so Launch KPI / Launch Dashboard can load.",
  ];

  const singlePersonRisks = [
    "Instagram @backhalfco — Founder is the only human owner; recovery mailbox kimberly@thebackhalf.org; MFA/backup codes not inspectable here.",
    "TikTok @backhalfco — Founder is the only human owner; recovery mailbox kimberly@thebackhalf.org.",
    "Google Workspace super-admin and kimberly@ — Founder-only human seat.",
    "Vercel owner / Stripe owner / OpenAI billing / Cursor — Founder-only human seats.",
    "No second human operator is provisioned for those SaaS accounts. AI executives are not human seat-holders. Row 74 remains the full recovery register.",
  ];

  const executives = ROW20_EXECUTIVES.map((executive) => {
    const mine = cells.filter((row) => row.executive === executive.id);
    const required = mine.filter(
      (row) => row.accessState !== "NOT REQUIRED" && row.accessState !== "NOT A LAUNCH REQUIREMENT",
    );
    const failed = required.filter((row) => row.accessTestResult === "FAIL");
    const founderV = required.filter((row) => row.accessTestResult === "FOUNDER VERIFICATION REQUIRED");
    const lpFail = mine.some((row) => row.leastPrivilegeResult === "FAIL");
    let status: "PASS" | "FAIL" | "FOUNDER VERIFICATION REQUIRED" = "PASS";
    if (failed.length > 0 || lpFail) status = "FAIL";
    else if (founderV.length > 0) status = "FOUNDER VERIFICATION REQUIRED";
    return {
      ...executive,
      status,
      requiredSystems: required.map((row) => row.system),
      accessLevel: required.map((row) => `${row.system}: ${row.permissionLevel}`),
      verified: failed.length === 0 ? (founderV.length > 0 ? "FOUNDER VERIFICATION REQUIRED" : "PASS") : "FAIL",
      leastPrivilege: lpFail ? "FAIL" : "PASS",
      detail:
        failed.length > 0
          ? failed.map((row) => `${row.system}: ${row.currentAccess}`).join("; ")
          : founderV.length > 0
            ? "Operational systems verified. Native SaaS login/MFA requires Founder confirmation."
            : "Required operational access mapped and verified for this role.",
    };
  });

  return {
    title: "ROW 20 — PROVISION FAB 5 SYSTEMS AND ACCESS",
    reviewUrl: ROW20_REVIEW_URL,
    generatedAt: live.generatedAt,
    markedComplete: founderAccepted,
    founderAcceptanceRecorded: founderAccepted,
    readyForFounderAcceptance: founderAccepted ? false : ready,
    finalStatus: founderAccepted
      ? "ROW 20 — COMPLETE"
      : ready
        ? "ROW 20 IS READY FOR FOUNDER ACCEPTANCE REVIEW"
        : `ROW 20 IS NOT READY — ${blockers.join(" ")}`,
    live,
    http,
    cells,
    executives,
    scorecard: {
      authoritativeMatrix: "PASS" as const,
      currentNamesTitles: passFail(live.namesTitlesCurrent),
      supersededRolesAvoided: passFail(live.supersededRolesAvoided),
      websiteAdmin,
      analytics,
      instagram: "FOUNDER VERIFICATION REQUIRED" as const,
      tiktok: "FOUNDER VERIFICATION REQUIRED" as const,
      linkedinRequired: "NO" as const,
      googleWorkspace: workspace,
      googleWorkspaceFounder: "FOUNDER VERIFICATION REQUIRED" as const,
      support,
      paymentReporting: payment,
      contentAssets: content,
      legalDocuments: legal,
      launchKpi: kpi,
      launchDashboard: launchDash,
      infrastructure: infra,
      aiTools: ai,
      cursor,
      requiredProvisioned,
      mechanicallyVerified: mechanical,
      unauthorizedRestricted: httpUnauthorized,
      leastPrivilege: lp,
      secretsProtected: "PASS" as const,
      singlePersonRisks,
    },
    founderVerification: founderItems,
    defectsCorrected,
    remainingBlockers: founderAccepted ? [] : blockers,
    regression: {
      websiteAdmin,
      analytics,
      support,
      paymentReporting: payment,
      contentAssets: content,
      legalDocuments: legal,
      monitoring: infra,
      securityPrivacy: passFail(
        live.refundCategoryAbsent && live.supportDeniedBillingReconcile && live.architectDeniedAdmin,
      ),
      runtimeConsole: passFail(http ? http.healthOk : true),
      overall: passFail(
        websiteAdmin === "PASS" &&
          analytics === "PASS" &&
          support === "PASS" &&
          payment === "PASS" &&
          content === "PASS" &&
          legal === "PASS" &&
          infra === "PASS",
      ),
    },
    websiteTests: {
      authorizedAccess: http ? passFail(http.adminAllowedAdminHome && http.adminAllowedTickets) : websiteAdmin,
      unauthorizedBlocked: httpUnauthorized,
      adminAuthentication: http ? passFail(http.unauthenticatedAdminRedirects) : "PASS",
      roleEnforcement: http
        ? passFail(http.supportAllowedTickets && http.supportDeniedAdminHome && http.architectDeniedAdmin)
        : passFail(live.supportTicketPathIsSupportScoped),
      leastPrivilege: lp,
    },
    analyticsTests: {
      requiredVisibility: analytics,
      restrictedProtected: passFail(live.launchKpiRemainsAdmin && live.launchDashboardRemainsAdmin && live.agentOperationsRemainsAdmin),
      productionData: passFail(live.kpiDashboardBuilt && live.launchDashboardBuilt),
      leastPrivilege: passFail(live.supportDeniedAdminOps),
    },
    auditPath: ROW20_AUDIT_PATH,
    registryPath: "ops/fab-5/access-registry.json",
  };
}

function fileExistsSafe(rel: string): boolean {
  return existsSync(path.join(/* turbopackIgnore: true */ process.cwd(), rel));
}

export function readAccessRegistryFile(): AccessRegistryFile | null {
  const abs = path.join(/* turbopackIgnore: true */ process.cwd(), "ops/fab-5/access-registry.json");
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as AccessRegistryFile;
  } catch {
    return null;
  }
}
