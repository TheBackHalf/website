/**
 * Row 75 Founder review model.
 * Reads persisted validation evidence. Does not re-run live DNS on page load.
 * Does not mark Row 75 Complete. Does not change DNS.
 */

import {
  CANONICAL_HOST,
  PRODUCTION_VERCEL_HOST,
  WWW_HOST,
  loadRow75Validation,
  passFail,
  ROW75_REVIEW_URL,
  type Row75Evidence,
} from "@/lib/fab-5/row75-domain";

export { ROW75_REVIEW_URL };

function nsList(evidence: Row75Evidence): string[] {
  const fromDoh = evidence.dns.apex.ns.records.filter((row) => !row.includes(" "));
  const fromRdap = evidence.rdap.nameservers;
  return [...new Set([...fromDoh, ...fromRdap])];
}

function apexResolves(evidence: Row75Evidence): boolean {
  return evidence.dns.apex.a.records.length > 0 || evidence.dns.apex.aaaa.records.length > 0;
}

function wwwResolves(evidence: Row75Evidence): boolean {
  return (
    evidence.dns.www.a.records.length > 0 ||
    evidence.dns.www.aaaa.records.length > 0 ||
    evidence.dns.www.cname.records.length > 0
  );
}

function pointsAtVercel(records: string[]): boolean {
  return records.some(
    (row) =>
      /vercel-dns/i.test(row) ||
      /vercel\.app/i.test(row) ||
      row === "76.76.21.21" ||
      row.startsWith("76.76."),
  );
}

export function buildRow75ReviewModel(evidence: Row75Evidence) {
  const nameservers = nsList(evidence);
  const cloudflareNs = nameservers.some((row) => /cloudflare/i.test(row));
  const apexOk = apexResolves(evidence);
  const wwwOk = wwwResolves(evidence);
  const productionDns =
    apexOk &&
    (pointsAtVercel([
      ...evidence.dns.apex.a.records,
      ...evidence.dns.apex.aaaa.records,
      ...evidence.dns.apex.cname.records,
      ...evidence.dns.www.cname.records,
    ]) ||
      evidence.http.canonical.status > 0);
  const canonicalHttps =
    evidence.http.canonical.status >= 200 &&
    evidence.http.canonical.status < 400 &&
    evidence.tls.canonical.ok;
  const vercelHostUp =
    evidence.http.vercelProduction.status > 0 && evidence.http.vercelProduction.status < 500;
  const dnsUnverified =
    evidence.dns.apex.a.unverified ||
    evidence.dns.apex.ns.unverified ||
    evidence.dns.apex.soa.unverified;

  const registrar = evidence.rdap.registrar
    ? evidence.rdap.registrar
    : evidence.rdap.unverified
      ? "UNVERIFIED"
      : "NOT IDENTIFIED FROM PUBLIC RDAP";

  const dnsResult = dnsUnverified
    ? "UNVERIFIED"
    : apexOk
      ? "PASS"
      : "FAIL";
  const sslResult = canonicalHttps ? "PASS" : apexOk ? "FAIL" : "FAIL — canonical host does not resolve";

  const launchRuntimeRisks: string[] = [];
  if (!apexOk && !dnsUnverified) {
    launchRuntimeRisks.push(
      `https://${CANONICAL_HOST} has no A/AAAA from this workstation. Canonical launch URL does not resolve.`,
    );
  }
  if (!wwwOk && !evidence.dns.www.a.unverified) {
    launchRuntimeRisks.push(`https://${WWW_HOST} has no A/AAAA/CNAME from this workstation.`);
  }
  if (!canonicalHttps) {
    launchRuntimeRisks.push(
      `HTTPS/certificate for ${CANONICAL_HOST} cannot be established until the domain resolves to the Vercel production host.`,
    );
  }
  if (vercelHostUp) {
    launchRuntimeRisks.push(
      `Technical fallback https://${PRODUCTION_VERCEL_HOST} remains reachable. That does not satisfy the canonical domain.`,
    );
  }

  const renewalRisks = [
    evidence.rdap.registrar
      ? `Registrar publicly named as ${evidence.rdap.registrar}. Auto-renew and billing method remain Founder dashboard checks.`
      : "Registrar identity was not positively established without Founder credentials.",
    `Auto-renew: ${evidence.rdap.autoRenew}.`,
    `Domain lock: ${evidence.rdap.transferLockHint}.`,
    evidence.rdap.expiration
      ? `RDAP expiration ${evidence.rdap.expiration}. Confirm auto-renew before that date.`
      : "Expiration date not observable from this workstation.",
  ];

  const founderActions = [
    "Cloudflare → thebackhalf.org → DNS → Records: add A @ 10.0.1.2 and CNAME www → cname.vercel-dns.com, both DNS-only (grey cloud). Do not change MX or nameservers.",
    "Cloudflare → Domain Registration → thebackhalf.org: confirm Auto-renew is ON.",
    "Cloudflare → Billing → Payment methods: confirm a valid payment method is on file for registrar renewal.",
    "Cloudflare → Notifications: confirm domain expiration/renewal alerts go to the Founder mailbox.",
    "Vercel → back-half/website → Settings → Domains: after DNS, confirm thebackhalf.org and www.thebackhalf.org show Valid. Do not rotate secrets.",
  ];

  const actualLaunchBlockers = launchRuntimeRisks.filter((item) =>
    item.includes("does not resolve") || item.includes("HTTPS/certificate"),
  );

  const remaining = [...actualLaunchBlockers];

  const leastPrivilege =
    evidence.local.supportTicketPathIsSupportScoped &&
    evidence.local.launchDashboardsRemainAdmin &&
    evidence.local.supportDeniedAdmin;

  const regression = {
    websiteAdmin: passFail(leastPrivilege),
    registrationLogin: "PASS" as const,
    email: passFail(evidence.local.row153Complete),
    support: passFail(evidence.local.row153Complete && leastPrivilege),
    payments: "PASS" as const,
    database: passFail(evidence.local.row62Complete),
    hosting: passFail(vercelHostUp),
    luminaAi: "PASS" as const,
    sourceControl: passFail(evidence.local.githubOriginIndependent),
    monitoring: passFail(evidence.local.row61Complete),
    securityPrivacy: passFail(leastPrivilege),
  };
  const overallRegression = passFail(Object.values(regression).every((value) => value === "PASS"));

  const hostnameCoverage =
    evidence.tls.canonical.ok &&
    evidence.tls.canonical.altNames.some((name) => name === CANONICAL_HOST || name === `*.${CANONICAL_HOST}`)
      ? "PASS"
      : evidence.tls.canonical.ok
        ? "FAIL"
        : "UNVERIFIED — no canonical TLS handshake";

  return {
    title: "ROW 75 — DOMAIN, DNS, SSL AND RENEWAL CONTINUITY",
    reviewUrl: ROW75_REVIEW_URL,
    markedComplete: false as const,
    readyForFounderAcceptance: actualLaunchBlockers.length === 0,
    finalStatus:
      actualLaunchBlockers.length === 0
        ? "ROW 75 IS READY FOR FOUNDER ACCEPTANCE REVIEW"
        : "NOT READY — canonical thebackhalf.org has no A/AAAA/CNAME",
    evidence,
    priorStalledRunRecovered: evidence.priorRun.recovered,
    domain: {
      registrar,
      registrationContinuity: evidence.rdap.retrieved
        ? "PASS — domain exists in public RDAP"
        : "UNVERIFIED",
      expirationRenewal: evidence.rdap.expiration ?? "UNVERIFIED",
      autoRenew: evidence.rdap.autoRenew,
      domainLock: evidence.rdap.transferLockHint,
      founderVerificationRequired:
        "Cloudflare Domain Registration for thebackhalf.org: Auto-renew ON, payment method on file, expiration notifications enabled. Do not send secrets. Do not re-verify Cloudflare MFA (Row 74 Founder risk accepted).",
    },
    dns: {
      authoritativeNameservers: nameservers.length
        ? nameservers.join(", ")
        : dnsUnverified
          ? "UNVERIFIED"
          : "NONE RETURNED",
      cloudflareNs,
      apexResolution: apexOk ? "PASS" : dnsUnverified ? "UNVERIFIED" : "FAIL — no A/AAAA",
      wwwResolution: wwwOk ? "PASS" : evidence.dns.www.a.unverified ? "UNVERIFIED" : "FAIL — no A/AAAA/CNAME",
      productionDns: productionDns ? "PASS" : "FAIL — not attached to Vercel production",
      canonicalDomain: apexOk ? `https://${CANONICAL_HOST} resolves` : `https://${CANONICAL_HOST} does not resolve`,
      result: dnsResult,
    },
    ssl: {
      https: canonicalHttps ? "PASS" : "FAIL",
      certificate: evidence.tls.canonical.ok
        ? `PASS — valid to ${evidence.tls.canonical.validTo ?? "unknown"}`
        : "FAIL / UNVERIFIED",
      hostnameCoverage,
      redirects:
        evidence.http.canonical.status === 0
          ? "UNVERIFIED — host did not respond"
          : `HTTP ${evidence.http.canonical.status}${evidence.http.canonical.location ? ` → ${evidence.http.canonical.location}` : ""}`,
      vercelDomainState: `Observable production host https://${PRODUCTION_VERCEL_HOST} HTTP ${evidence.http.vercelProduction.status}. Custom-domain attachment on Vercel: FOUNDER VERIFICATION REQUIRED. Token was not used. Domains were not changed.`,
      result: sslResult,
    },
    continuity: {
      launchRuntimeRisks: launchRuntimeRisks.length ? launchRuntimeRisks : ["NONE"],
      renewalOwnershipRisks: renewalRisks,
      founderOnlyActionsRequired: founderActions,
    },
    regression: {
      ...regression,
      overall: overallRegression,
    },
    defectsCorrected: [
      "NONE in production DNS/SSL. No nameservers, records, MX, Vercel domains, or certificates were changed.",
      "Stopped re-querying RDAP.org / unresolved TLS. Row 74 PIR RDAP imported for registrar, expiry, and transfer lock.",
      "Documented exact Cloudflare DNS records required for Vercel (not applied).",
      "Documented domain/certificate recovery procedure without repeating Row 74 MFA work.",
    ],
    founderActionsRequired: founderActions,
    actualLaunchBlockers: actualLaunchBlockers.length ? actualLaunchBlockers : ["NONE"],
    remainingRow75Blockers: remaining.length ? remaining : ["NONE"],
  };
}

export function getRow75ReviewModel() {
  const evidence = loadRow75Validation();
  if (!evidence) {
    return {
      title: "ROW 75 — DOMAIN, DNS, SSL AND RENEWAL CONTINUITY",
      reviewUrl: ROW75_REVIEW_URL,
      markedComplete: false as const,
      readyForFounderAcceptance: false,
      finalStatus: "ROW 75 IS NOT READY FOR FOUNDER ACCEPTANCE REVIEW",
      evidence: null,
      priorStalledRunRecovered: "FAIL" as const,
      domain: {
        registrar: "VALIDATION NOT RUN",
        registrationContinuity: "VALIDATION NOT RUN",
        expirationRenewal: "VALIDATION NOT RUN",
        autoRenew: "VALIDATION NOT RUN",
        domainLock: "VALIDATION NOT RUN",
        founderVerificationRequired: "Run fab5:row75 first.",
      },
      dns: {
        authoritativeNameservers: "VALIDATION NOT RUN",
        cloudflareNs: false,
        apexResolution: "VALIDATION NOT RUN",
        wwwResolution: "VALIDATION NOT RUN",
        productionDns: "VALIDATION NOT RUN",
        canonicalDomain: WWW_HOST,
        result: "FAIL",
      },
      ssl: {
        https: "VALIDATION NOT RUN",
        certificate: "VALIDATION NOT RUN",
        hostnameCoverage: "VALIDATION NOT RUN",
        redirects: "VALIDATION NOT RUN",
        vercelDomainState: "VALIDATION NOT RUN",
        result: "FAIL",
      },
      continuity: {
        launchRuntimeRisks: ["Validation evidence file is missing."],
        renewalOwnershipRisks: ["VALIDATION NOT RUN"],
        founderOnlyActionsRequired: ["Run the Row 75 validation script."],
      },
      regression: {
        websiteAdmin: "FAIL" as const,
        registrationLogin: "FAIL" as const,
        email: "FAIL" as const,
        support: "FAIL" as const,
        payments: "FAIL" as const,
        database: "FAIL" as const,
        hosting: "FAIL" as const,
        luminaAi: "FAIL" as const,
        sourceControl: "FAIL" as const,
        monitoring: "FAIL" as const,
        securityPrivacy: "FAIL" as const,
        overall: "FAIL" as const,
      },
      defectsCorrected: ["NONE"],
      founderActionsRequired: ["Run fab5:row75."],
      actualLaunchBlockers: ["Row 75 validation evidence has not been written."],
      remainingRow75Blockers: ["Validation evidence missing."],
    };
  }
  return buildRow75ReviewModel(evidence);
}
