"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  SUPPORT_MAILBOX,
  SUPPORT_OWNER_TITLES,
  SUPPORT_TICKET_STATUSES,
  ownerTitles,
  slaStateLabel,
  supportCategoryLabel,
  ticketStatusLabel,
  workflowStatusLabel,
} from "@/lib/support/catalog";
import type { SupportOperationsMetrics } from "@/lib/support/metrics";
import type { SupportTicket } from "@/lib/support/ticket-types";

export function SupportTicketConsole({
  tickets,
  metrics,
  canAccessAdminOps = false,
}: {
  tickets: SupportTicket[];
  metrics: SupportOperationsMetrics;
  canAccessAdminOps?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function updateStatus(id: string, next: string) {
    const response = await fetch("/api/admin/support/tickets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    const payload = (await response.json()) as { error?: string };
    setStatus(response.ok ? `Updated ${id}` : payload.error ?? "rejected");
    if (response.ok) router.refresh();
  }

  async function fetchMail() {
    const response = await fetch("/api/admin/support/tickets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fetchMail: true }),
    });
    const payload = (await response.json()) as { error?: string; fetched?: number };
    setStatus(
      response.ok
        ? `Fetched ${payload.fetched ?? 0} inbound messages`
        : payload.error ?? "rejected",
    );
    if (response.ok) router.refresh();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 text-bh-ink">
      <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
        Support tickets
      </h1>
      <p className="mt-3 max-w-3xl font-sans text-sm font-light text-bh-muted">
        Authoritative tracker for Architect support. Public form: /support.
        Mailbox: {SUPPORT_MAILBOX}. Sender identity: The Back Half Support.
        Primary support / customer experience: Nia Prism — Chief Experience &
        Transformation Officer. Backup / routing / operations: Michelle
        Northstar — Chief of Staff & Operations Officer. Technical / security:
        Imani Heartbeat — Chief Technology & Risk Officer.
      </p>
      <p className="mt-4 font-sans text-sm">
        <a href="/ops/support" className="underline decoration-bh-purple/30">
          Account lookup
        </a>
        {canAccessAdminOps ? (
          <>
            {" · "}
            <a
              href="/ops/admin/launch-dashboard"
              className="underline decoration-bh-purple/30"
            >
              Daily Launch Dashboard
            </a>
            {" · "}
            {" · "}
            <a href="/ops/admin/privacy-rights" className="underline decoration-bh-purple/30">
              Privacy rights
            </a>
          </>
        ) : null}
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="New today" value={String(metrics.newToday)} />
        <Metric label="Open" value={String(metrics.open)} />
        <Metric label="Resolved today" value={String(metrics.resolvedToday)} />
        <Metric label="Overdue" value={String(metrics.overdue)} />
        <Metric label="Approaching SLA" value={String(metrics.approaching)} />
        <Metric label="P1 / P2 open" value={`${metrics.p1} / ${metrics.p2}`} />
        <Metric label="Urgent escalations" value={String(metrics.activeUrgentEscalations)} />
        <Metric label="Repeat issues" value={String(metrics.repeatIssues.length)} />
      </div>

      <div className="mt-6 flex gap-3">
        <button type="button" className="bh-cta w-fit" onClick={fetchMail}>
          Fetch inbound mail
        </button>
        {status ? <p className="font-sans text-sm text-bh-muted">{status}</p> : null}
      </div>

      {metrics.repeatIssues.length > 0 ? (
        <section className="mt-10" aria-labelledby="repeat-issues">
          <h2 id="repeat-issues" className="font-display text-2xl">
            Repeat issues
          </h2>
          <ul className="mt-3 space-y-1 font-sans text-sm text-bh-muted">
            {metrics.repeatIssues.map((row) => (
              <li key={row.fingerprint}>
                {supportCategoryLabel(row.category)} · {row.count} tickets · {row.sampleSubject}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[1200px] border-collapse font-sans text-sm">
          <thead>
            <tr className="border-b border-bh-purple/20 text-left text-bh-muted">
              <th className="py-2 pr-3">Ticket</th>
              <th className="py-2 pr-3">Created</th>
              <th className="py-2 pr-3">Requester</th>
              <th className="py-2 pr-3">Category</th>
              <th className="py-2 pr-3">Subject</th>
              <th className="py-2 pr-3">Priority</th>
              <th className="py-2 pr-3">Workflow</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Owner</th>
              <th className="py-2 pr-3">Response due</th>
              <th className="py-2 pr-3">SLA</th>
              <th className="py-2">Escalation</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td className="py-3 text-bh-muted" colSpan={12}>
                  No support tickets yet.
                </td>
              </tr>
            ) : (
              tickets
                .slice()
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((ticket) => {
                  const urgent =
                    ticket.priority === "P1" ||
                    ticket.escalation.status === "notified" ||
                    ticket.slaState === "urgent" ||
                    ticket.slaState === "overdue";
                  return (
                    <tr
                      key={ticket.id}
                      className={`border-b border-bh-purple/10 align-top ${
                        urgent ? "bg-bh-purple/5" : ""
                      }`}
                    >
                      <td className="py-2 pr-3">
                        {ticket.id}
                        {urgent ? (
                          <span className="mt-1 block font-sans text-[10px] uppercase tracking-[0.14em] text-bh-purple">
                            Urgent
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3">
                        {ticket.createdAt.replace("T", " ").slice(0, 16)}
                      </td>
                      <td className="py-2 pr-3">
                        {ticket.requesterName}
                        <br />
                        {ticket.requesterEmail}
                      </td>
                      <td className="py-2 pr-3">
                        {supportCategoryLabel(ticket.category)}
                      </td>
                      <td className="py-2 pr-3">{ticket.subject}</td>
                      <td className="py-2 pr-3">{ticket.priority}</td>
                      <td className="py-2 pr-3">{workflowStatusLabel(ticket.status)}</td>
                      <td className="py-2 pr-3">
                        <select
                          value={ticket.status}
                          onChange={(event) =>
                            updateStatus(ticket.id, event.target.value)
                          }
                          className="rounded-sm border border-bh-purple/20 px-2 py-1"
                          aria-label={`Status for ${ticket.id}`}
                        >
                          {SUPPORT_TICKET_STATUSES.map((value) => (
                            <option key={value} value={value}>
                              {ticketStatusLabel(value)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        {SUPPORT_OWNER_TITLES[ticket.assignedOwner]}
                      </td>
                      <td className="py-2 pr-3">
                        {ticket.responseDueAt.replace("T", " ").slice(0, 16)}
                      </td>
                      <td className="py-2 pr-3">{slaStateLabel(ticket.slaState)}</td>
                      <td className="py-2">
                        {ticket.escalation.status === "notified"
                          ? ownerTitles(ticket.escalation.targets)
                          : "None"}
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-bh-purple/15 px-4 py-3">
      <p className="font-sans text-xs tracking-[0.08em] text-bh-muted">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}
