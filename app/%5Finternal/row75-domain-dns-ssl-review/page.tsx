import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow75ReviewModel } from "@/lib/fab-5/row75-review";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 75 Founder acceptance review only.
 * URL: /_internal/row75-domain-dns-ssl-review
 * Localhost-only. Reads persisted validation evidence. Does not change DNS.
 * Does not mark Row 75 complete.
 */
function assertLocalhostOnly(hostHeader: string | null) {
  const host = (hostHeader ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  const hostname = host.split(":")[0] ?? "";
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  ) {
    return;
  }
  notFound();
}

function tone(value: string) {
  if (value === "PASS" || value === "NO" || value === "NONE" || value.startsWith("NONE")) {
    return "text-emerald-800";
  }
  if (value === "FAIL" || value.startsWith("FAIL") || value === "YES") return "text-red-800";
  if (value.includes("FOUNDER VERIFICATION") || value.includes("UNVERIFIED") || value.includes("NOT IDENTIFIED")) {
    return "text-amber-900";
  }
  return "text-bh-ink";
}

export default async function Row75DomainDnsSslReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = getRow75ReviewModel();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row75-domain-dns-ssl-review"
    >
      <div className="mx-auto w-full max-w-5xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 75 DOMAIN, DNS, SSL AND RENEWAL
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          {model.title}
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          Founder Acceptance Review. Row 75 is not marked Complete. This page
          reads persisted validation evidence and does not re-query DNS on load.
          DNS, nameservers, registrar settings, Vercel domains, and certificates
          were not changed. Secrets are not shown.
        </p>
        <p
          className={`mt-4 font-sans text-sm font-medium ${
            model.readyForFounderAcceptance ? "text-emerald-800" : "text-red-800"
          }`}
        >
          {model.finalStatus}
        </p>

        <section className="mt-10 mb-12" aria-labelledby="row75-prior">
          <h2
            id="row75-prior"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Prior stalled run
          </h2>
          <p className="font-sans text-sm">
            Recovered:{" "}
            <span className={tone(model.priorStalledRunRecovered)}>
              {model.priorStalledRunRecovered}
            </span>
          </p>
          {model.evidence ? (
            <p className="mt-2 font-sans text-sm text-bh-muted">
              {model.evidence.priorRun.lastCompletedPriorCheck}
            </p>
          ) : null}
        </section>

        <section className="mb-12" aria-labelledby="row75-domain">
          <h2
            id="row75-domain"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Domain
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>Registrar: {model.domain.registrar}</li>
            <li>Registration Continuity: {model.domain.registrationContinuity}</li>
            <li>Expiration/Renewal: {model.domain.expirationRenewal}</li>
            <li>Auto-Renew: {model.domain.autoRenew}</li>
            <li>Domain Lock: {model.domain.domainLock}</li>
            <li>Founder Verification Required: {model.domain.founderVerificationRequired}</li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row75-dns">
          <h2
            id="row75-dns"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            DNS
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>Authoritative Nameservers: {model.dns.authoritativeNameservers}</li>
            <li>
              Apex Resolution:{" "}
              <span className={tone(model.dns.apexResolution)}>{model.dns.apexResolution}</span>
            </li>
            <li>
              WWW Resolution:{" "}
              <span className={tone(model.dns.wwwResolution)}>{model.dns.wwwResolution}</span>
            </li>
            <li>
              Production DNS:{" "}
              <span className={tone(model.dns.productionDns)}>{model.dns.productionDns}</span>
            </li>
            <li>Canonical Domain: {model.dns.canonicalDomain}</li>
            <li>
              Result: <span className={tone(model.dns.result)}>{model.dns.result}</span>
            </li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row75-ssl">
          <h2
            id="row75-ssl"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            SSL / HTTPS
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>
              HTTPS: <span className={tone(model.ssl.https)}>{model.ssl.https}</span>
            </li>
            <li>Certificate: {model.ssl.certificate}</li>
            <li>Hostname Coverage: {model.ssl.hostnameCoverage}</li>
            <li>Redirects: {model.ssl.redirects}</li>
            <li>Vercel Domain State: {model.ssl.vercelDomainState}</li>
            <li>
              Result: <span className={tone(model.ssl.result)}>{model.ssl.result}</span>
            </li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row75-continuity">
          <h2
            id="row75-continuity"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Continuity
          </h2>
          <p className="mb-2 font-sans text-sm font-medium">Launch runtime risks</p>
          <ul className="mb-4 list-disc space-y-2 pl-5 font-sans text-sm">
            {model.continuity.launchRuntimeRisks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mb-2 font-sans text-sm font-medium">Renewal / ownership risks</p>
          <ul className="mb-4 list-disc space-y-2 pl-5 font-sans text-sm">
            {model.continuity.renewalOwnershipRisks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mb-2 font-sans text-sm font-medium">Founder-only actions</p>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.continuity.founderOnlyActionsRequired.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row75-regression">
          <h2
            id="row75-regression"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Regression
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>Website/Admin: {model.regression.websiteAdmin}</li>
            <li>Registration/Login: {model.regression.registrationLogin}</li>
            <li>Email: {model.regression.email}</li>
            <li>Support: {model.regression.support}</li>
            <li>Payments: {model.regression.payments}</li>
            <li>Database: {model.regression.database}</li>
            <li>Hosting: {model.regression.hosting}</li>
            <li>Lumina/AI: {model.regression.luminaAi}</li>
            <li>Source Control: {model.regression.sourceControl}</li>
            <li>Monitoring: {model.regression.monitoring}</li>
            <li>Security/Privacy: {model.regression.securityPrivacy}</li>
            <li>Overall Regression: {model.regression.overall}</li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row75-blockers">
          <h2
            id="row75-blockers"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Remaining Row 75 blockers
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.remainingRow75Blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
