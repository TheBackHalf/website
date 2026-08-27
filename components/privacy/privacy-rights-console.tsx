"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  PRIVACY_MAILBOX_ADDRESS,
  PRIVACY_OWNER_TITLES,
  PRIVACY_REQUEST_STATUSES,
  type PrivacyRequestStatus,
} from "@/lib/privacy/catalog";
import { privacyTypeLabel } from "@/lib/privacy/copy";
import type { PrivacyRightsMetrics } from "@/lib/privacy/metrics";
import type { PrivacyRequest } from "@/lib/privacy/types";

export function PrivacyRightsConsole({
  requests,
  metrics,
}: {
  requests: PrivacyRequest[];
  metrics: PrivacyRightsMetrics;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function post(body: Record<string, unknown>) {
    const response = await fetch("/api/admin/privacy/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { error?: string; status?: string };
    setStatus(response.ok ? payload.status ?? "updated" : payload.error ?? "rejected");
    if (response.ok) router.refresh();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 text-bh-ink">
      <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
        Privacy rights requests
      </h1>
      <p className="mt-3 max-w-3xl font-sans text-sm font-light text-bh-muted">
        Operational tracker for access, correction, deletion, export, consent
        withdrawal, and privacy inquiries. Mailbox: {PRIVACY_MAILBOX_ADDRESS}.
        Process owner: {PRIVACY_OWNER_TITLES.imani}. Routing:{" "}
        {PRIVACY_OWNER_TITLES.michelle}. Founder is not the routine operator.
        Do not ask for passwords. Do not issue legal conclusions.
      </p>
      <p className="mt-4 font-sans text-sm">
        <a href="/ops/admin/support" className="underline decoration-bh-purple/30">
          Support tickets
        </a>
        {" · "}
        <a href="/ops/admin" className="underline decoration-bh-purple/30">
          Admin operations
        </a>
        {" · "}
        <a href="/privacy/request" className="underline decoration-bh-purple/30">
          Public request form
        </a>
      </p>
      <dl className="mt-8 grid grid-cols-2 gap-4 font-sans text-sm md:grid-cols-4">
        <div>
          <dt className="text-bh-muted">Open</dt>
          <dd className="text-2xl">{metrics.open}</dd>
        </div>
        <div>
          <dt className="text-bh-muted">Identity pending</dt>
          <dd className="text-2xl">{metrics.identityPending}</dd>
        </div>
        <div>
          <dt className="text-bh-muted">Overdue</dt>
          <dd className="text-2xl">{metrics.overdue}</dd>
        </div>
        <div>
          <dt className="text-bh-muted">Total</dt>
          <dd className="text-2xl">{metrics.total}</dd>
        </div>
      </dl>
      {status ? <p className="mt-4 font-sans text-sm">{status}</p> : null}
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse font-sans text-sm">
          <thead>
            <tr className="border-b border-bh-purple/20 text-left">
              <th className="py-2 pr-3">ID</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Requester</th>
              <th className="py-2 pr-3">Identity</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">SLA</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td className="py-6 text-bh-muted" colSpan={7}>
                  No privacy-rights requests.
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr key={request.id} className="border-b border-bh-purple/10 align-top">
                  <td className="py-3 pr-3 font-medium">{request.id}</td>
                  <td className="py-3 pr-3">
                    {privacyTypeLabel(request.type, request.locale)}
                  </td>
                  <td className="py-3 pr-3">
                    {request.requesterName}
                    <br />
                    {request.requesterEmail}
                  </td>
                  <td className="py-3 pr-3">
                    {request.identity.status} / {request.identity.method}
                  </td>
                  <td className="py-3 pr-3">{request.status}</td>
                  <td className="py-3 pr-3">{request.slaState}</td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        className="underline decoration-bh-purple/30"
                        onClick={() =>
                          void post({ id: request.id, action: "fulfill" })
                        }
                      >
                        Fulfill
                      </button>
                      {request.type === "DELETION" ? (
                        <button
                          type="button"
                          className="underline decoration-bh-purple/30"
                          onClick={() =>
                            void post({
                              id: request.id,
                              action: "fulfill",
                              confirmDeletion: true,
                            })
                          }
                        >
                          Confirm deletion
                        </button>
                      ) : null}
                      <label>
                        <span className="sr-only">Status</span>
                        <select
                          defaultValue={request.status}
                          onChange={(event) =>
                            void post({
                              id: request.id,
                              action: "status",
                              status: event.target.value,
                            })
                          }
                        >
                          {PRIVACY_REQUEST_STATUSES.map((value: PrivacyRequestStatus) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
