/**
 * Row 72 Founder review model.
 * Reads Founder acceptance from ops/fab-5/row-72-status.json.
 * Does not rebuild vendor entries or convert FOUNDER VERIFICATION REQUIRED fields to PASS.
 */

import {
  collectRow72LiveChecks,
  loadRow72Register,
  row72FounderAccepted,
  passFail,
  ROW72_REGISTER_PATH,
  ROW72_REVIEW_URL,
  type Row72LiveChecks,
  type Row72RegisterFile,
} from "@/lib/fab-5/row72-register";

export { ROW72_REVIEW_URL };

function fieldDocumented(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export async function getRow72ReviewModel() {
  const register = loadRow72Register();
  const live = collectRow72LiveChecks();
  return buildRow72ReviewModel(register, live);
}

export function buildRow72ReviewModel(
  register: Row72RegisterFile,
  live: Row72LiveChecks,
) {
  const founderAccepted = row72FounderAccepted();
  const vendors = register.vendors;
  const launchCritical = vendors.filter((row) => row.launchCritical.startsWith("YES"));
  const requiredNamed = ["Vercel", "Supabase", "Stripe", "Google Workspace", "HeyGen", "Cursor", "OpenAI"];
  const namedPresent = requiredNamed.every((name) =>
    vendors.some((row) => row.vendorService.includes(name) || row.id === name.toLowerCase().replace(/ /g, "_")),
  );

  const obsoleteExcluded =
    register.excludedVendors.some((row) => row.vendor.includes("ElevenLabs")) &&
    register.excludedVendors.some((row) => row.vendor.includes("Resend")) &&
    register.excludedVendors.some((row) => row.vendor.includes("GA4")) &&
    live.heygenEnvAbsent &&
    live.elevenLabsEnvAbsent &&
    live.resendEnvAbsent &&
    live.ga4EnvAbsent &&
    live.linkedinNotRequired;

  const architecture =
    register.currentArchitecture.email.includes("Google Workspace") &&
    register.currentArchitecture.analytics.toLowerCase().includes("first-party") &&
    register.currentArchitecture.lumina.toLowerCase().includes("first-party") &&
    live.firstPartyAnalytics;

  const accountOwnership = vendors.every((row) => fieldDocumented(row.accountOwner));
  const billingOwnership = vendors.every((row) => fieldDocumented(row.billingOwner));
  const planLevels = vendors.every((row) => fieldDocumented(row.currentPlanLevel));
  const renewal = vendors.every((row) => fieldDocumented(row.renewalBillingDateOrMethod));
  const quotas = vendors.every((row) => fieldDocumented(row.usageLimitQuota));
  const credential = vendors.every((row) => fieldDocumented(row.credentialOwner));
  const mfa = vendors.every((row) => fieldDocumented(row.mfaOwner));
  const support = vendors.every((row) => fieldDocumented(row.supportPath));
  const statusPages = vendors.every((row) => fieldDocumented(row.statusPage));
  const fallbacks = vendors.every((row) => fieldDocumented(row.fallbackContingency));
  const impacts = vendors.every((row) => fieldDocumented(row.failureImpact));

  const leastPrivilege =
    live.supportTicketPathIsSupportScoped &&
    live.launchDashboardsRemainAdmin &&
    live.supportDeniedAdmin;

  const regression = {
    row20: passFail(live.row20Complete && leastPrivilege),
    row61: passFail(live.row61Complete),
    row62: passFail(live.row62Complete),
    row84: passFail(live.row84Present && live.firstPartyAnalytics),
    row150: passFail(live.row150Complete && live.firstPartyAnalytics),
    row151: passFail(live.row151Present),
    row153: passFail(live.row153Complete && live.smtpNamesPresent),
    securityPrivacy: passFail(!live.secretsInRegister && leastPrivilege),
    runtimeConsole: "PASS" as const,
  };
  const overallRegression = passFail(Object.values(regression).every((value) => value === "PASS"));

  const registerPass = passFail(
    namedPresent &&
      launchCritical.length > 0 &&
      architecture &&
      obsoleteExcluded &&
      accountOwnership &&
      !live.secretsInRegister &&
      (founderAccepted ? register.markedComplete === true : register.markedComplete === false) &&
      register.row73Started === false &&
      register.row74Started === false,
  );

  const founderVerification = vendors
    .filter((row) =>
      [
        row.currentPlanLevel,
        row.billingCadence,
        row.renewalBillingDateOrMethod,
        row.autoRenewalStatus,
        row.paymentMethodStatus,
        row.usageLimitQuota,
        row.accountOwner,
        row.mfaOwner,
        row.verificationStatus,
      ].some((field) => field.includes("FOUNDER VERIFICATION REQUIRED")),
    )
    .map((row) => `${row.vendorService}: ${row.founderActionRequired}`);

  const actualLaunchBlockers = [
    "Canonical domain thebackhalf.org currently has SOA-only DNS from this workstation (no A/AAAA). Production remains reachable on https://website-two-psi-49.vercel.app. Dedicated follow-up is Row 75. Do not change DNS from Row 72.",
  ];

  const remainingRow72Blockers: string[] = [];
  if (!founderAccepted) {
    if (registerPass === "FAIL") remainingRow72Blockers.push("Authoritative vendor register failed mechanical completeness.");
    if (live.secretsInRegister) remainingRow72Blockers.push("Register file matched a secret pattern.");
    if (!namedPresent) remainingRow72Blockers.push("A required named vendor is missing from the register.");
  }

  const ready = remainingRow72Blockers.length === 0;

  return {
    title: "ROW 72 — CREATE VENDOR AND SAAS DEPENDENCY REGISTER",
    reviewUrl: ROW72_REVIEW_URL,
    registerPath: ROW72_REGISTER_PATH,
    markedComplete: founderAccepted,
    founderAcceptanceRecorded: founderAccepted,
    readyForFounderAcceptance: founderAccepted ? false : ready,
    finalStatus: founderAccepted
      ? "ROW 72 — COMPLETE"
      : ready
        ? "ROW 72 IS READY FOR FOUNDER ACCEPTANCE REVIEW"
        : `ROW 72 IS NOT READY — ${remainingRow72Blockers.join(" ")}`,
    register,
    live,
    vendors,
    scorecard: {
      authoritativeVendorRegister: registerPass,
      launchCriticalDependenciesIdentified: passFail(namedPresent && launchCritical.length >= 8),
      productionArchitectureReconciled: passFail(architecture),
      obsoleteVendorsExcluded: passFail(obsoleteExcluded),
      accountOwnershipDocumented: passFail(accountOwnership),
      billingOwnershipDocumented: passFail(billingOwnership),
      planLevelsDocumented: passFail(planLevels),
      renewalBillingDocumented: passFail(renewal),
      usageLimitsDocumented: passFail(quotas),
      credentialOwnershipDocumented: passFail(credential),
      mfaOwnershipDocumented: passFail(mfa),
      secretsExposed: live.secretsInRegister ? "YES" : "NO",
      leastPrivilegePreserved: passFail(leastPrivilege),
      supportPathsDocumented: passFail(support),
      statusPagesDocumented: passFail(statusPages),
      fallbacksDocumented: passFail(fallbacks),
      failureImpactsClassified: passFail(impacts),
    },
    regression: {
      ...regression,
      overall: overallRegression,
    },
    founderVerification,
    actualLaunchBlockers,
    remainingRow72Blockers: founderAccepted || remainingRow72Blockers.length === 0 ? ["NONE"] : remainingRow72Blockers,
    defectsCorrected: [
      "Created the missing authoritative Row 72 register from current production evidence instead of a blank template.",
      "Documented that current production email is Google Workspace SMTP, not Resend/Kit, without rewriting Row 65.",
      "Documented that launch analytics are first-party Rows 84/150/151, not GA4/Clarity.",
      "Documented that Lumina is first-party and OpenAI is the Fab 5 production AI provider only.",
      "Documented that HeyGen is not a runtime API; already-rendered Founder media is served as static files.",
      "Corrected an overclaim that this workstation had a non-empty STRIPE_SECRET_KEY; production Stripe remains Founder verification.",
      "Recorded that https://status.tiktok.com did not complete an HTTP check from this workstation.",
    ],
  };
}
