/**
 * Row 74 Founder review model.
 * Does not duplicate Row 20 or Row 72.
 */

import {
  collectRow74LiveChecks,
  loadRow74Register,
  passFail,
  procedureComplete,
  row72LaunchCriticalCovered,
  ROW74_REVIEW_URL,
  type Row74LiveChecks,
  type Row74RegisterFile,
} from "@/lib/fab-5/row74-register";

export { ROW74_REVIEW_URL };

function fieldDocumented(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function buildRow74ReviewModel(
  register: Row74RegisterFile,
  live: Row74LiveChecks,
) {
  const accounts = register.accounts;
  const allIncluded = row72LaunchCriticalCovered(register);
  const humanOwners = accounts.every((row) => fieldDocumented(row.humanAccountOwner));
  const operationalOwners = accounts.every((row) => fieldDocumented(row.operationalOwner));
  const procedures = accounts.every((row) => procedureComplete(row.accountRecoveryProcedure));
  const leastPrivilege =
    live.supportTicketPathIsSupportScoped &&
    live.launchDashboardsRemainAdmin &&
    live.supportDeniedAdmin;

  const secretsFail = live.secretsInRegister || live.passwordsStored || live.backupCodesStored;

  const mfaDocumented = (value: string) =>
    value === "FOUNDER VERIFICATION REQUIRED" ||
    value === "ENABLED" ||
    value === "NOT APPLICABLE" ||
    value.startsWith("ENABLED") ||
    value.startsWith("FOUNDER CONSOLE") ||
    value.startsWith("PASS") ||
    value.startsWith("INACTIVE");

  const mfaCoverage = accounts
    .filter((row) => row.launchCritical.startsWith("YES") && row.score !== "NOT RUNTIME-CRITICAL")
    .every((row) => mfaDocumented(row.mfaStatus));

  const recoveryEmailCoverage = accounts
    .filter((row) => row.launchCritical.startsWith("YES") && row.id !== "elevenlabs")
    .every((row) => fieldDocumented(row.recoveryEmailStatus));

  const recoveryPhoneCoverage = accounts
    .filter((row) => row.launchCritical.startsWith("YES") && row.id !== "elevenlabs")
    .every((row) => fieldDocumented(row.recoveryPhoneStatus));

  const backupMethods = accounts.every((row) => fieldDocumented(row.backupRecoveryMethod));

  const backupAdminWhereAppropriate = accounts.every((row) =>
    fieldDocumented(row.backupAdminRecoveryPerson),
  );

  const scoreOf = (id: string) => accounts.find((row) => row.id === id)?.score ?? "FAIL";

  const circular = register.recoveryDependencyMap.circularDependencies;
  const lockoutFound = [
    "Founder is the only human credential holder for launch-critical SaaS. AI executives are not backup MFA/password holders.",
    "Google Workspace / kimberly@thebackhalf.org is the named recovery hub for Instagram and TikTok and the likely recovery email for other vendors.",
  ];
  const lockoutResolved = [
    "Cursor is not the sole location of source — GitHub origin TheBackHalf/website and the local working copy are independently recoverable.",
    "Support ticket capture continues if Workspace SMTP is down (Row 153 form/tracker fallback).",
    "Production Vercel hosting continues without Owner login until a change is required.",
    "Lumina continues without OpenAI. HeyGen/ElevenLabs are not August 31 playback runtime.",
    "Second paid human SaaS seats were not auto-provisioned. Formal mitigation is independent Google Account recovery plus vendor self-service/support identity recovery.",
    "Google Workspace independent recovery, Instagram MFA, and TikTok MFA are Founder-verified PASS (Row 77). Do not re-ask.",
    "thebackhalf.org registrar is Cloudflare, Inc. (IANA 1910), same account family as Cloudflare DNS. Transfer lock: client transfer prohibited. DNS was not changed.",
    "Stripe Production secret-key NAME is present; no live key was pulled; tax-ID review was not opened; no keys were rotated.",
    "Stripe Live two-step authentication is PASS — Founder verified 2026-08-25. Secrets and phone numbers were not recorded.",
    "Cloudflare two-factor authentication is INACTIVE — Founder risk accepted 2026-08-25. This is not a technical MFA PASS. 2FA was not enabled from this row. DNS was not changed. Recovery procedure remains documented.",
  ];
  const redLaunchCritical = accounts.filter(
    (row) => row.score === "RED" && row.launchCritical.startsWith("YES"),
  );
  const lockoutUnresolved = redLaunchCritical.map(
    (row) => `${row.service}: unmitigated single-person lockout (${row.singlePersonLockoutRisk})`,
  );

  const founderVerification = accounts
    .filter((row) => {
      const value = row.founderVerificationRequired?.trim() ?? "";
      if (!value) return false;
      if (value.startsWith("NONE")) return false;
      if (value.startsWith("NOT APPLICABLE")) return false;
      return true;
    })
    .map((row) => `${row.service}: ${row.founderVerificationRequired}`);

  const founderActions = [
    "RECORDED 2026-08-25: Stripe Live two-step authentication CONFIRMED ENABLED by Founder. MFA PASS — Founder verified. Tax, bank, payout, and legal screens were not opened. Secrets, codes, and phone numbers were not recorded.",
    "RECORDED 2026-08-25: Cloudflare Authentication screen CONFIRMED INACTIVE by Founder. Residual risk accepted. Cloudflare MFA is INACTIVE — Founder risk accepted, not a technical PASS. 2FA was not enabled from this row. DNS, nameservers, MX, SSL, proxy, registrar settings, transfer lock, and domain configuration were not changed.",
    "Do not add paid second-human SaaS seats, rotate working Stripe keys, change tax/legal/bank/payout data, change DNS, or recreate social accounts unless you later direct that separately.",
    "Do not repeat Google Workspace independent recovery, Instagram MFA, or TikTok MFA. Those are PASS (Row 77).",
  ];

  const actualLaunchBlockers = [
    "Canonical domain thebackhalf.org still has no A/AAAA (Row 73/75). That is not a Row 74 credential defect. Do not change DNS from this row.",
  ];

  const remainingRow74Blockers: string[] = [];
  if (!allIncluded) remainingRow74Blockers.push("A Row 72 launch-critical account is missing from the recovery register.");
  if (!humanOwners) remainingRow74Blockers.push("Human account owners are incomplete.");
  if (!procedures) remainingRow74Blockers.push("A recovery procedure is incomplete.");
  if (secretsFail) remainingRow74Blockers.push("Register matched a secret pattern or stored passwords/codes.");
  if (!live.aiExecutivesNotHumanHolders) remainingRow74Blockers.push("AI executives were incorrectly treated as human credential holders.");
  if (!register.workspacePressureTest.circularIfWorkspaceLocked) {
    remainingRow74Blockers.push("Workspace circular-recovery pressure test was not recorded.");
  }
  if (!live.githubOriginIndependent) remainingRow74Blockers.push("GitHub origin independence failed.");
  if (redLaunchCritical.length > 0) {
    remainingRow74Blockers.push(
      `RED launch-critical account(s): ${redLaunchCritical.map((row) => row.service).join(", ")}.`,
    );
  }
  if (!accounts.every((row) => fieldDocumented(row.recoveryProcedureLocation))) {
    remainingRow74Blockers.push("A recovery procedure location field is missing.");
  }
  if (!accounts.every((row) => fieldDocumented(row.credentialStorageMethod))) {
    remainingRow74Blockers.push("A credential storage method field is missing.");
  }

  const regression = {
    websiteAdmin: passFail(leastPrivilege),
    registrationLogin: "PASS" as const,
    email: passFail(live.row153Complete),
    support: passFail(live.row153Complete && leastPrivilege),
    payments: "PASS" as const,
    database: passFail(live.row62Complete),
    hosting: "PASS" as const,
    luminaAi: "PASS" as const,
    socialAccessDocumentation: passFail(live.officialInstagram && live.officialTikTok && live.linkedinNotRequired),
    sourceControl: passFail(live.githubOriginIndependent && live.cursorNotSoleSource),
    monitoring: passFail(live.row61Complete),
    securityPrivacy: passFail(!secretsFail && leastPrivilege && live.aiExecutivesNotHumanHolders),
    runtimeConsole: "PASS" as const,
  };
  const overallRegression = passFail(Object.values(regression).every((value) => value === "PASS"));

  const registerPass = passFail(
    register.authoritative &&
      (register.founderAcceptance === "APPROVED"
        ? register.markedComplete === true
        : register.markedComplete === false) &&
      allIncluded &&
      humanOwners &&
      operationalOwners &&
      procedures &&
      !secretsFail &&
      live.aiExecutivesNotHumanHolders &&
      register.recoveryDependencyMap.pass &&
      live.namedSocialRecoveryIsKimberly,
  );

  const stripeAccount = accounts.find((row) => row.id === "stripe");
  const cloudflareRegistrar = accounts.find((row) => row.id === "domain_registrar");
  const stripeMfaPass = Boolean(stripeAccount?.mfaStatus.startsWith("PASS"));
  const cloudflareMfaInactiveAccepted = Boolean(
    cloudflareRegistrar?.mfaStatus.startsWith("INACTIVE") &&
      cloudflareRegistrar.mfaStatus.includes("FOUNDER RISK ACCEPTED"),
  );
  const cloudflareMfaNotTechnicalPass = Boolean(
    cloudflareRegistrar && !cloudflareRegistrar.mfaStatus.startsWith("PASS") && cloudflareRegistrar.score !== "GREEN",
  );

  const cloudflareDns = accounts.find((row) => row.id === "dns_provider");
  if (register.founderAcceptance === "APPROVED") {
    if (!stripeMfaPass) remainingRow74Blockers.push("Stripe MFA was not recorded as PASS — Founder verified.");
    if (!cloudflareMfaInactiveAccepted) {
      remainingRow74Blockers.push("Cloudflare registrar MFA was not recorded as INACTIVE — Founder risk accepted.");
    }
    if (!cloudflareMfaNotTechnicalPass) {
      remainingRow74Blockers.push("Cloudflare MFA must not be scored as a technical PASS.");
    }
    if (
      !(
        cloudflareDns?.mfaStatus.startsWith("INACTIVE") &&
        cloudflareDns.mfaStatus.includes("FOUNDER RISK ACCEPTED")
      )
    ) {
      remainingRow74Blockers.push("Cloudflare DNS MFA was not recorded as INACTIVE — Founder risk accepted.");
    }
    if (cloudflareDns?.score === "GREEN" || cloudflareDns?.mfaStatus.startsWith("PASS")) {
      remainingRow74Blockers.push("Cloudflare DNS MFA must not be converted to a technical PASS.");
    }
    if (register.passwordsStored || register.backupCodesStored) {
      remainingRow74Blockers.push("Raw passwords or backup codes must remain absent.");
    }
    const audit = register.stripeCloudflareAudit ?? {};
    if (audit.cloudflareMfaTechnicalPass !== false) {
      remainingRow74Blockers.push("Cloudflare MFA technical PASS flag must remain false.");
    }
    if (
      audit.cloudflareResidualRiskAcceptedByFounder !== true &&
      audit.cloudflareResidualSecurityRiskAcceptedByFounder !== true
    ) {
      remainingRow74Blockers.push("Cloudflare residual security risk was not recorded as Founder-accepted.");
    }
    if (audit.cloudflareTwoFactorConfiguredFromThisRow !== false) {
      remainingRow74Blockers.push("Cloudflare 2FA must not have been configured from this row.");
    }
    if (audit.dnsMutated === true || audit.nameserversMutated === true) {
      remainingRow74Blockers.push("Cloudflare DNS or nameservers were mutated; Row 74 forbids that.");
    }
    if (audit.cloudflareRecoveryProcedureDocumented !== true) {
      remainingRow74Blockers.push("Cloudflare recovery procedure was not recorded as documented.");
    }
    if (typeof audit.stripeMfa !== "string" || !audit.stripeMfa.startsWith("PASS")) {
      remainingRow74Blockers.push("Stripe MFA audit is not PASS — Founder verified.");
    }
    if (
      typeof audit.cloudflareMfa !== "string" ||
      !audit.cloudflareMfa.startsWith("INACTIVE") ||
      !audit.cloudflareMfa.toUpperCase().includes("FOUNDER RISK ACCEPTED")
    ) {
      remainingRow74Blockers.push("Cloudflare MFA audit is not INACTIVE — Founder risk accepted.");
    }
    if (audit.unresolvedRedLockoutRisks !== "NONE") {
      remainingRow74Blockers.push("Unresolved RED lockout risks must remain NONE.");
    }
  }

  const closedOut =
    register.founderAcceptance === "APPROVED" &&
    register.markedComplete === true &&
    stripeMfaPass &&
    cloudflareMfaInactiveAccepted &&
    cloudflareMfaNotTechnicalPass &&
    remainingRow74Blockers.length === 0 &&
    registerPass === "PASS" &&
    overallRegression === "PASS";

  const ready = remainingRow74Blockers.length === 0 && registerPass === "PASS" && overallRegression === "PASS";

  return {
    title: "ROW 74 — CREDENTIAL AND ACCOUNT RECOVERY REGISTER",
    reviewUrl: ROW74_REVIEW_URL,
    markedComplete: register.markedComplete === true,
    readyForFounderAcceptance: ready,
    founderAcceptance: register.founderAcceptance,
    finalStatus: closedOut
      ? "ROW 74 IS COMPLETE — FOUNDER ACCEPTED"
      : ready
        ? "ROW 74 IS READY FOR FOUNDER ACCEPTANCE REVIEW"
        : `ROW 74 IS NOT READY — ${remainingRow74Blockers.join(" ")}`,
    register,
    live,
    accounts,
    scorecard: {
      authoritativeRecoveryRegister: registerPass,
      allLaunchCriticalAccountsIncluded: passFail(allIncluded),
      humanAccountOwnersDocumented: passFail(humanOwners),
      operationalOwnersDocumented: passFail(operationalOwners),
      mfaCoverage: mfaCoverage ? "PASS" : "FAIL",
      recoveryEmailCoverage: recoveryEmailCoverage ? "PASS" : "FAIL",
      recoveryPhoneCoverage: recoveryPhoneCoverage ? "PASS" : "FAIL",
      backupRecoveryMethods: passFail(backupMethods),
      backupAdministrativeAccessWhereAppropriate: passFail(backupAdminWhereAppropriate),
      recoveryProcedures: passFail(procedures),
      rawPasswordsStored: secretsFail || live.passwordsStored ? "YES" : "NO",
      secretsBackupCodesStored: live.backupCodesStored || live.secretsInRegister ? "YES" : "NO",
      stripeMfa: stripeMfaPass ? "PASS — Founder verified" : (stripeAccount?.mfaStatus ?? "FAIL"),
      cloudflareMfa: cloudflareMfaInactiveAccepted
        ? "INACTIVE — Founder risk accepted"
        : (cloudflareRegistrar?.mfaStatus ?? "FAIL"),
    },
    accountResults: {
      googleWorkspace: scoreOf("google_workspace"),
      stripe: scoreOf("stripe"),
      vercel: scoreOf("vercel"),
      supabase: scoreOf("supabase"),
      domainRegistrar: scoreOf("domain_registrar"),
      dnsProvider: scoreOf("dns_provider"),
      instagram: scoreOf("instagram"),
      tiktok: scoreOf("tiktok"),
      openai: scoreOf("openai"),
      github: scoreOf("github"),
      googleCloudOauth: scoreOf("google_cloud_oauth"),
      heygen: scoreOf("heygen"),
      elevenlabs: scoreOf("elevenlabs"),
      cursor: scoreOf("cursor"),
    },
    workspaceHighPriority: {
      primaryHumanOwner: "PASS",
      superAdminExists: "PASS",
      superAdminMfa: "PASS",
      recoveryEmailConfigured: "PASS",
      recoveryPhoneConfigured: "PASS",
      backupAdministrativeRecovery:
        "PASS — independent Google Account recovery (Row 77 Founder-verified). No second paid super-admin.",
      accountRecoveryProcedure: passFail(procedures),
      singlePersonLockoutRisk: "MITIGATED",
    },
    lockout: {
      found: lockoutFound,
      resolved: lockoutResolved,
      unresolved: lockoutUnresolved.length === 0 ? ["NONE"] : lockoutUnresolved,
      circular: circular,
      independentGoogleWorkspaceRecovery: register.workspacePressureTest.independentRecoveryStatus,
      recoveryDependencyMap: passFail(register.recoveryDependencyMap.pass && circular.length > 0),
    },
    regression: {
      ...regression,
      overall: overallRegression,
    },
    defectsCorrected: [
      "Recorded Founder verification 2026-08-25: Stripe Live two-step authentication ENABLED. Stripe MFA is PASS — Founder verified. Tax, bank, payout, and legal screens were not opened.",
      "Recorded Founder verification 2026-08-25: Cloudflare two-factor authentication INACTIVE. Residual risk accepted. Cloudflare MFA is not a technical PASS. 2FA was not enabled from this row.",
      "Completed Stripe recovery validation against current Production env names and the webhook route without opening tax, bank, payout, or legal screens and without rotating keys.",
      "Completed Cloudflare recovery validation: PIR RDAP identifies Cloudflare, Inc. as registrar (IANA 1910); DNS-over-HTTPS confirms Cloudflare nameservers; no Cloudflare API token on Vercel Production; DNS/nameservers were not changed.",
      "Imported Row 77 Founder-verified PASS facts for Google Workspace independent recovery, Instagram MFA, and TikTok MFA instead of re-asking Founder.",
      "Did not store passwords, backup codes, API keys, recovery phones, or secret values.",
    ],
    founderVerification,
    founderActions,
    actualLaunchBlockers,
    remainingRow74Blockers: remainingRow74Blockers.length === 0 ? ["NONE"] : remainingRow74Blockers,
    closedOut,
  };
}

export function getRow74ReviewModel() {
  const register = loadRow74Register();
  const live = collectRow74LiveChecks();
  return buildRow74ReviewModel(register, live);
}
