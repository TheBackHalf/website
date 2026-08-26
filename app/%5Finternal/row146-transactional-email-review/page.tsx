import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow146ReviewModel } from "@/lib/email/review";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 146 Founder acceptance review only.
 * URL: /_internal/row146-transactional-email-review
 * Folder uses %5F so Next.js does not treat it as a private `_` segment.
 * Localhost-only. Does not mark Row 146 complete.
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

function Status({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const pass =
    value === "PASS" ||
    value === "implemented" ||
    value === "google_workspace_smtp" ||
    value === "No";
  const fail = value === "FAIL";
  const tone = pass
    ? "text-emerald-800"
    : fail
      ? "text-red-800"
      : "text-bh-ink";
  return (
    <li className="flex items-start justify-between gap-4 border-b border-bh-purple/10 py-2">
      <span className="font-sans text-sm font-light text-bh-muted">{label}</span>
      <span className={`font-sans text-sm font-medium ${tone}`}>{value}</span>
    </li>
  );
}

export default async function Row146TransactionalEmailReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = await getRow146ReviewModel();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row146-transactional-email-review"
    >
      <div className="mx-auto w-full max-w-4xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 146 CONFIGURE TRANSACTIONAL EMAIL
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          Row 146 — Configure Transactional Email
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          Imani Heartbeat technical implementation. Founder acceptance stays
          with Kimberly Walker (human). This page does not mark the row
          complete and does not display secrets.
        </p>
        <ul className="mt-8 rounded-2xl border border-bh-purple/15 bg-white px-6 py-4">
          <Status label="Provider" value={model.provider.id} />
          <Status label="Sender domain" value={model.sender.domain} />
          <Status
            label="SMTP ready"
            value={model.sender.smtpReady ? "PASS" : "PENDING"}
          />
          <Status
            label="From address allowed"
            value={model.sender.fromAllowed ? "PASS" : "PENDING"}
          />
          <Status label="Suppression" value={model.capabilities.suppression} />
          <Status
            label="Bounce handling"
            value={model.capabilities.bounceHandling}
          />
          <Status label="Unsubscribe" value={model.capabilities.unsubscribe} />
          <Status
            label="Deliverability monitoring"
            value={model.capabilities.deliverabilityMonitoring}
          />
          <Status
            label="DNS mutated"
            value={model.dnsNotMutated ? "No" : "Yes"}
          />
          <Status
            label="Founder acceptance"
            value={model.founderAcceptance ?? "open"}
          />
          <Status
            label="Row complete"
            value={model.rowComplete ? "true" : "false"}
          />
        </ul>
        <h2 className="mt-10 font-display text-2xl">Remaining</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 font-sans text-sm font-light text-bh-muted">
          {model.remaining.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
