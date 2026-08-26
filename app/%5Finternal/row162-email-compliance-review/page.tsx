import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow162ReviewModel } from "@/lib/email/review";

export const dynamic = "force-dynamic";

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

function Status({ label, value }: { label: string; value: string }) {
  const pass =
    value === "PASS" ||
    value === "true" ||
    value === "YES" ||
    value.startsWith("supabase") ||
    value.startsWith("file_");
  const fail = value === "FAIL" || value === "false" || value === "NO";
  const tone = pass ? "text-emerald-800" : fail ? "text-red-800" : "text-bh-ink";
  return (
    <li className="flex items-start justify-between gap-4 border-b border-bh-purple/10 py-2">
      <span className="font-sans text-sm font-light text-bh-muted">{label}</span>
      <span className={`font-sans text-sm font-medium ${tone}`}>{value}</span>
    </li>
  );
}

export default async function Row162EmailComplianceReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = getRow162ReviewModel();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row162-email-compliance-review"
    >
      <div className="mx-auto w-full max-w-4xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 162 EMAIL MARKETING COMPLIANCE
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          Row 162 — Email Marketing Compliance and Suppression Controls
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          Founder Acceptance Review. Row 162 is not marked Complete. Kimberly
          Walker (human) remains the sole Founder acceptance authority. Kit is
          not wired. Account registration and purchase are not marketing
          consent.
        </p>

        <section className="mt-10 mb-12">
          <h2 className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]">
            Controls
          </h2>
          <ul>
            <Status label="Row marked complete" value={String(model.rowMarkedComplete)} />
            <Status label="Founder accepted" value={String(model.founderAccepted)} />
            <Status label="Kit wired" value={String(model.kitWired)} />
            <Status
              label="Launch newsletter capture"
              value={String(model.newsletterCaptureOnLaunchPath)}
            />
            <Status
              label="Registration is marketing consent"
              value={String(model.registrationIsMarketingConsent)}
            />
            <Status
              label="Purchase is marketing consent"
              value={String(model.purchaseIsMarketingConsent)}
            />
            <Status
              label="Physical address configured"
              value={String(model.physicalAddressConfigured)}
            />
            <Status
              label="Unsubscribe signing configured"
              value={String(model.unsubscribeSigningConfigured)}
            />
            <Status label="Store backend" value={model.durability.backend} />
            <Status label="Sender brand" value={model.sender.brandName} />
            <Status label="Sender legal name" value={model.sender.legalName} />
            <Status label="Unsubscribe path" value={model.unsubscribePath} />
            <Status label="One-click path" value={model.oneClickPath} />
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]">
            Transactional templates
          </h2>
          <p className="mb-3 font-sans text-sm font-light text-bh-muted">
            These send without marketing footer, unsubscribe, or marketing
            suppression. A marketing opt-out does not stop them.
          </p>
          <ul>
            {model.transactionalTemplates.map((id) => (
              <Status key={id} label={id} value="transactional" />
            ))}
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]">
            Marketing templates
          </h2>
          <p className="mb-3 font-sans text-sm font-light text-bh-muted">
            These require sender identification, physical address, consent
            record, unsubscribe link, List-Unsubscribe headers, and suppression
            enforcement.
          </p>
          <ul>
            {model.marketingTemplates.map((id) => (
              <Status key={id} label={id} value="marketing" />
            ))}
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]">
            Remaining
          </h2>
          <p className="font-sans text-sm font-light leading-relaxed text-bh-muted">
            {model.remainingBlockers}
          </p>
          <p className="mt-3 font-sans text-sm font-light leading-relaxed text-bh-muted">
            Mechanical tests:{" "}
            <code>npx tsx scripts/fab-5/row-162-validate.ts</code>
          </p>
        </section>
      </div>
    </main>
  );
}
