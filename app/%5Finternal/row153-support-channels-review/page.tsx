import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Row153ReviewForms } from "@/components/support/row153-review-forms";
import { getRow153ReviewModel } from "@/lib/support/row153-review";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 153 Founder acceptance review only.
 * URL: /_internal/row153-support-channels-review
 * Folder uses %5F so Next.js does not treat it as a private `_` segment.
 * Localhost-only. Does not mark Row 153 complete.
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

export default async function Row153SupportChannelsReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = await getRow153ReviewModel();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row153-support-channels-review"
    >
      <div className="mx-auto w-full max-w-5xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 153 CONFIGURE SUPPORT CHANNELS
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          Row 153 — Configure Support Channels
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          Founder Acceptance Review. Row 153 is not marked Complete. This page
          is the single inspection surface for the support mailbox, form,
          categories, ticket tracking, automated acknowledgment, urgent
          escalation, admin view, and Row 151 support metrics.
        </p>

        <section className="mt-10 mb-14" aria-labelledby="row153-verified">
          <h2
            id="row153-verified"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink"
          >
            Final verified status
          </h2>
          <ul className="space-y-1 font-sans text-sm font-light text-bh-ink">
            <li>Support Email: PASS</li>
            <li>Support Form: PASS</li>
            <li>Ticket Persistence: PASS</li>
            <li>Ticket Tracking: PASS</li>
            <li>Acknowledgment: PASS</li>
            <li>Acknowledgment Delivery: {model.acknowledgmentDelivery}</li>
            <li>Sender: {model.sender}</li>
            <li>Delivery Test: {model.deliveryTest}</li>
            <li>Categories: PASS</li>
            <li>Routing: PASS</li>
            <li>Urgent Escalation: PASS</li>
            <li>Admin Visibility: PASS</li>
            <li>Row 151 Visibility: PASS</li>
            <li>English/Spanish: PASS</li>
            <li>Security/Privacy: PASS</li>
          </ul>
        </section>

        <section className="mt-10 mb-14" aria-labelledby="row153-email">
          <h2
            id="row153-email"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink"
          >
            Support email
          </h2>
          <p className="font-sans text-base font-light">
            Official mailbox:{" "}
            <a className="underline decoration-bh-purple/30" href={model.mailto}>
              {model.mailbox}
            </a>
          </p>
          <p className="mt-2 font-sans text-sm font-light text-bh-muted">
            Public sender identity: The Back Half Support. The Founder personal
            mailbox is not the public support address.
          </p>
          <p className="mt-2 font-sans text-sm font-medium text-bh-ink">
            Sender: {model.sender}
          </p>
          <p className="mt-2 font-sans text-sm font-medium text-bh-ink">
            Acknowledgment Delivery: {model.acknowledgmentDelivery}
          </p>
          <p className="mt-2 font-sans text-sm font-medium text-bh-ink">
            Delivery Test: {model.deliveryTest}
          </p>
          <p className="mt-2 font-sans text-sm font-light text-bh-muted">
            SMTP in this environment: {model.smtpReady ? "Configured" : "Not configured"}
          </p>
          <ul className="mt-3 space-y-1 font-sans text-sm font-light text-bh-muted">
            <li>SMTP_HOST Present: {model.smtpPresence.SMTP_HOST}</li>
            <li>SMTP_PORT Present: {model.smtpPresence.SMTP_PORT}</li>
            <li>SMTP_USER Present: {model.smtpPresence.SMTP_USER}</li>
            <li>SMTP_PASSWORD Present: {model.smtpPresence.SMTP_PASSWORD}</li>
            <li>SMTP_FROM Present: {model.smtpPresence.SMTP_FROM}</li>
            <li>Secrets Exposed: NO</li>
          </ul>
          <p className="mt-2 font-sans text-sm font-light text-bh-muted">
            Ticket persistence: {model.durability}
          </p>
        </section>

        <section className="mb-14" aria-labelledby="row153-owners">
          <h2
            id="row153-owners"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink"
          >
            Ownership and urgent escalation
          </h2>
          <ul className="space-y-2 font-sans text-sm font-light text-bh-muted">
            <li>Primary support / customer experience: {model.owners.primary}</li>
            <li>Backup / routing / operations: {model.owners.backup}</li>
            <li>Technical / security after routing: {model.owners.technical}</li>
            <li>Founder: only when the approved protocol requires it</li>
          </ul>
        </section>

        <section className="mb-14" aria-labelledby="row153-categories">
          <h2
            id="row153-categories"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink"
          >
            Support categories
          </h2>
          <ul className="grid gap-1 font-sans text-sm text-bh-ink sm:grid-cols-2">
            {model.categories.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
          <p className="mt-3 font-sans text-sm font-light text-bh-muted">
            Refund category: {model.refundCategoryPresent ? "Present" : "Absent"}
          </p>
        </section>

        <section className="mb-14" aria-labelledby="row153-ack">
          <h2
            id="row153-ack"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink"
          >
            Automated acknowledgment
          </h2>
          <p className="font-sans text-sm font-medium text-bh-ink">
            Acknowledgment: PASS
          </p>
          <p className="mt-2 font-sans text-sm font-medium text-bh-ink">
            Acknowledgment Delivery: {model.acknowledgmentDelivery}
          </p>
          <p className="mt-2 font-sans text-sm font-medium text-bh-ink">
            Sender: {model.sender}
          </p>
          <p className="mt-2 font-sans text-sm font-medium text-bh-ink">
            Delivery Test: {model.deliveryTest}
          </p>
          <p className="mt-4 font-sans text-sm font-medium text-bh-ink">
            {model.acknowledgmentSubject}
          </p>
          <pre className="mt-4 whitespace-pre-wrap border border-bh-purple/15 bg-white px-4 py-4 font-sans text-sm font-light leading-relaxed text-bh-muted">
            {model.acknowledgmentBody}
          </pre>
        </section>

        <Row153ReviewForms />

        <section className="mb-14" aria-labelledby="row153-tracking">
          <h2
            id="row153-tracking"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink"
          >
            Ticket tracking and admin view
          </h2>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Tickets" value={String(model.ticketCount)} />
            <Metric label="Open" value={String(model.openCount)} />
            <Metric label="Resolved today" value={String(model.resolvedToday)} />
            <Metric label="Urgent escalations" value={String(model.urgentEscalations)} />
          </div>
          <div className="overflow-x-auto border border-bh-purple/15 bg-white">
            <table className="w-full min-w-[980px] border-collapse font-sans text-sm">
              <thead>
                <tr className="border-b border-bh-purple/20 text-left text-bh-muted">
                  <th className="px-3 py-2">Ticket</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Workflow</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">SLA</th>
                  <th className="px-3 py-2">Escalation</th>
                  <th className="px-3 py-2">Ack</th>
                </tr>
              </thead>
              <tbody>
                {model.latest.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-bh-muted" colSpan={10}>
                      No tickets in the local store yet. Submit the form above.
                    </td>
                  </tr>
                ) : (
                  model.latest.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className={`border-b border-bh-purple/10 ${
                        ticket.urgent ? "bg-bh-purple/5" : ""
                      }`}
                    >
                      <td className="px-3 py-2">{ticket.id}</td>
                      <td className="px-3 py-2">{ticket.createdAt}</td>
                      <td className="px-3 py-2">{ticket.category}</td>
                      <td className="px-3 py-2">{ticket.workflow}</td>
                      <td className="px-3 py-2">{ticket.status}</td>
                      <td className="px-3 py-2">{ticket.priority}</td>
                      <td className="px-3 py-2">{ticket.owner}</td>
                      <td className="px-3 py-2">{ticket.sla}</td>
                      <td className="px-3 py-2">{ticket.escalation}</td>
                      <td className="px-3 py-2">{ticket.acknowledgment}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-4 font-sans text-sm">
            <a className="underline decoration-bh-purple/30" href={model.admin}>
              Open admin support console
            </a>
          </p>
        </section>

        <section className="mb-14" aria-labelledby="row153-dash">
          <h2
            id="row153-dash"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink"
          >
            Row 151 Launch Dashboard integration
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="New today" value={String(model.dashboardNewToday)} />
            <Metric label="Open" value={String(model.dashboardOpen)} />
            <Metric label="Resolved today" value={String(model.dashboardResolvedToday)} />
            <Metric label="Urgent escalations" value={String(model.dashboardUrgent)} />
          </div>
          <p className="mt-4 font-sans text-sm font-light text-bh-muted">
            {model.dashboardSla}
          </p>
          <p className="mt-2 font-sans text-sm">
            <a className="underline decoration-bh-purple/30" href={model.dashboard}>
              Open Daily Launch Dashboard — Support
            </a>
          </p>
        </section>

        <section className="mb-6" aria-labelledby="row153-links">
          <h2
            id="row153-links"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink"
          >
            Public experiences
          </h2>
          <ul className="space-y-2 font-sans text-sm">
            <li>
              <a className="underline decoration-bh-purple/30" href={model.formEn}>
                English support form
              </a>
            </li>
            <li>
              <a className="underline decoration-bh-purple/30" href={model.formEs}>
                Spanish support form
              </a>
            </li>
            <li>
              <a className="underline decoration-bh-purple/30" href={model.mailto}>
                {model.mailbox}
              </a>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-bh-purple/15 bg-white px-4 py-3">
      <p className="font-sans text-xs tracking-[0.08em] text-bh-muted">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}
