"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LaunchDashboardModel } from "@/lib/launch-dashboard/types";
import {
  AVAILABILITY_AREAS,
  RISK_CATEGORIES,
  RISK_SEVERITY,
  RISK_STATUS,
  SUPPORT_CATEGORIES,
} from "@/lib/launch-dashboard/types";

function titleCaseDisplay(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (trimmed === "n/a") return "N/A";
  if (/^[A-Z0-9]+(?:[ /,—-]+[A-Z0-9]+)*$/.test(trimmed) && /[A-Z]/.test(trimmed)) {
    return trimmed;
  }
  const brands: Record<string, string> = {
    lumina: "Lumina",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    tiktok: "TikTok",
  };
  return trimmed
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (brands[lower]) return brands[lower];
      if (lower === "n/a") return "N/A";
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function money(cents: number | null): string {
  if (cents === null) return "N/A";
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function count(value: number | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  return String(value);
}

function rate(value: number | null): string {
  if (value === null) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}

function healthClass(health: string): string {
  if (health === "RED") return "border-red-700 bg-red-50 text-red-900";
  if (health === "YELLOW") return "border-amber-600 bg-amber-50 text-amber-950";
  return "border-emerald-700 bg-emerald-50 text-emerald-950";
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-sm border border-bh-purple/10 bg-white px-4 py-3">
      <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-bh-muted">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl text-bh-ink">{value}</p>
      {hint ? <p className="mt-1 font-sans text-xs text-bh-muted">{hint}</p> : null}
    </div>
  );
}

export function LaunchDashboardView({
  model,
}: {
  model: LaunchDashboardModel;
}) {
  const t = model.traffic;
  const c = model.conversion;
  const r = model.revenue;
  const a = model.activation;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 text-bh-ink">
      <p className="font-sans text-xs uppercase tracking-[0.18em] text-bh-muted">
        Row 151 · Daily Launch Dashboard
      </p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.02em]">
        Is The Back Half launch healthy today?
      </h1>
      <p className="mt-3 max-w-3xl font-sans text-base font-light text-bh-muted">
        Consolidated command view. Marketing detail remains on the Row 84 dashboard.
        This page does not replace source systems.
      </p>
      <p className="mt-3 font-sans text-sm">
        <a href="/ops/admin/executive-dashboard" className="underline decoration-bh-purple/30">
          Launch-Day Executive Dashboard
        </a>
        {" · "}
        <a href="/ops/admin/launch-kpi" className="underline decoration-bh-purple/30">
          Marketing KPI
        </a>
        {" · "}
        <a href="/ops/admin" className="underline decoration-bh-purple/30">
          Admin
        </a>
      </p>

      <section
        className={`mt-8 rounded-sm border px-5 py-4 ${healthClass(model.health)}`}
        aria-labelledby="exec-summary"
      >
        <h2 id="exec-summary" className="font-display text-2xl">
          Launch Health: {model.health}
        </h2>
        <p className="mt-2 font-sans text-sm">
          Today (ET): {model.dateEt} · {model.launchLabel} · {model.launchDayNumber}
        </p>
        <p className="mt-1 font-sans text-sm">
          Last updated: {model.dataFreshness.lastRefresh}
          {model.viewingFrozenSnapshot ? " · viewing frozen daily snapshot" : ""}
        </p>
        <p className="mt-1 font-sans text-sm">
          Critical issues open: {model.criticalIssuesOpen}
        </p>
        <p className="mt-1 font-sans text-sm font-medium">
          Founder attention required: {model.founderAttentionRequired ? "YES" : "NO"}
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 font-sans text-sm">
          {model.healthReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </section>

      <DatePicker dateEt={model.dateEt} />

      <section className="mt-12" aria-labelledby="traffic">
        <h2 id="traffic" className="font-display text-3xl">
          1. Traffic
        </h2>
        <p className="mt-2 font-sans text-xs text-bh-muted">
          {model.dataFreshness.analytics} Registration-page sessions reuse Row 84.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Website sessions today"
            value={count(t.websiteSessions.today)}
            hint={`Cumulative ${count(t.websiteSessions.cumulative)} · vs prior day ${count(t.websiteSessions.versusPriorDay)} · baseline ${String(t.websiteSessions.baseline)}`}
          />
          <Metric
            label="Unique visitors today"
            value={count(t.uniqueVisitors.today)}
            hint={`Cumulative ${count(t.uniqueVisitors.cumulative)} · vs prior day ${count(t.uniqueVisitors.versusPriorDay)}`}
          />
          <Metric
            label="Registration-page sessions today"
            value={count(t.registrationPageSessions.today)}
            hint={`Row 84 · cumulative ${count(t.registrationPageSessions.cumulative)} · vs prior day ${count(t.registrationPageSessions.versusPriorDay)} · baseline ${String(t.registrationPageSessions.baseline)}`}
          />
          <Metric
            label="Campaign page views today"
            value={count(t.campaignSessions.today)}
            hint={`Direct/organic today ${count(t.directSessions.today)} · vs prior day ${count(t.campaignSessions.versusPriorDay)} · top source ${titleCaseDisplay(t.topSource)}`}
          />
        </div>
        <ul className="mt-4 space-y-1 font-sans text-sm text-bh-muted">
          {t.bySource.map((row) => (
            <li key={row.source}>
              {titleCaseDisplay(row.source)}: {row.today} today / {row.cumulative} cumulative
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="conversion">
        <h2 id="conversion" className="font-display text-3xl">
          2. Conversion
        </h2>
        <p className="mt-2 font-sans text-sm text-bh-muted">
          Become an Architect CTA and Journey explore CTA are existing Row 150{" "}
          <code>cta_clicked</code> counts. Funnel: registration page viewed → started →
          completed → checkout started → purchase completed. Rates name their denominator.
          Purchases in this funnel are billing paid purchases.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric
            label="Become an Architect CTA"
            value={count(c.becomeArchitectCta)}
            hint="cta_clicked · become_architect"
          />
          <Metric
            label="Journey explore CTA"
            value={count(c.journeyExploreCta)}
            hint="cta_clicked · journey_explore"
          />
          <Metric label="Registration page viewed" value={count(c.registrationPage)} />
          <Metric label="Registration started" value={count(c.registrationStarted)} />
          <Metric label="Registration completed" value={count(c.registrationCompleted)} />
          <Metric label="Checkout started" value={count(c.checkoutStarted)} />
          <Metric label="Purchases (billing)" value={count(c.purchases)} />
        </div>
        <ul className="mt-4 space-y-1 font-sans text-sm text-bh-muted">
          <li>
            {c.registrationConversion.label}: {rate(c.registrationConversion.value)} (
            {c.registrationConversion.numerator} ÷ {c.registrationConversion.denominator})
          </li>
          <li>
            {c.landingToPurchase.label}: {rate(c.landingToPurchase.value)} (
            {c.landingToPurchase.numerator} ÷ {c.landingToPurchase.denominator})
          </li>
          <li>
            {c.checkoutCompletion.label}: {rate(c.checkoutCompletion.value)} (
            {c.checkoutCompletion.numerator} ÷ {c.checkoutCompletion.denominator})
          </li>
          {c.dropOff.map((row) => (
            <li key={row.from}>
              Drop-off {row.from} → {row.to}: {row.lost}
            </li>
          ))}
          <li>
            Reconciliation today — billing {c.billingPurchases} · Row 150 {c.row150Purchases} ·
            Row 84 {c.row84Purchases}
          </li>
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="revenue">
        <h2 id="revenue" className="font-display text-3xl">
          3. Revenue
        </h2>
        <p className="mt-2 font-sans text-xs text-bh-muted">{r.source}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Gross today" value={money(r.grossTodayCents)} />
          <Metric
            label="Gross cumulative (launch campaign)"
            value={money(r.grossCumulativeCents)}
            hint={`${r.launchPeriodLabel}. ${r.historicalLabel}: ${count(r.historicalPurchases)} purchases / ${money(r.historicalRevenueCents)} excluded.`}
          />
          <Metric label="Purchases today" value={count(r.purchasesToday)} />
          <Metric label="Purchases cumulative" value={count(r.purchasesCumulative)} />
          <Metric
            label="Average transaction today"
            value={r.averageTransactionCents === null ? "N/A" : money(r.averageTransactionCents)}
          />
          <Metric label="Failed payments today" value={count(r.failedPaymentsToday)} />
          <Metric label="Net today" value={money(r.netTodayCents)} />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="activation">
        <h2 id="activation" className="font-display text-3xl">
          4. Activation
        </h2>
        <p className="mt-2 font-sans text-sm text-bh-muted">{a.definition}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Purchased" value={count(a.purchased)} />
          <Metric label="Account active (verified)" value={count(a.accountActive)} />
          <Metric label="Onboarding started" value={count(a.onboardingStarted)} />
          <Metric label="Onboarding completed" value={count(a.onboardingCompleted)} />
          <Metric label="Journey entered" value={count(a.journeyEntered)} />
          <Metric
            label="Activated Architects"
            value={count(a.activated)}
            hint={`${a.activationRate.label}: ${rate(a.activationRate.value)} (${a.activationRate.numerator} ÷ ${a.activationRate.denominator})`}
          />
          <Metric label="Purchased, not activated" value={count(a.purchasedNotActivated)} />
          <Metric
            label="Stalled onboarding / journey"
            value={`${a.stalledOnboarding} / ${a.stalledJourney}`}
          />
          <Metric
            label="Lumina opened today"
            value={count(a.luminaOpenedToday)}
            hint="lumina_opened · usage/health, not conversation content"
          />
          <Metric
            label="Downloads completed today"
            value={count(a.downloadsCompletedToday)}
            hint="download_completed"
          />
          <Metric
            label="Journey completed (cumulative)"
            value={count(a.journeyCompleted)}
            hint="Chapter 7 completion"
          />
          <Metric
            label="Certificates downloaded"
            value={count(a.certificateDownloaded)}
          />
          <Metric
            label="Membership activated"
            value={count(a.membershipActivated)}
            hint="membership_activated"
          />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="errors">
        <h2 id="errors" className="font-display text-3xl">
          5. Errors
        </h2>
        <p className="mt-2 font-sans text-xs text-bh-muted">
          Counts only. No credentials, payloads, or user content.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-bh-purple/20 text-left text-bh-muted">
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Area</th>
                <th className="py-2 pr-3">Today</th>
                <th className="py-2 pr-3">Open</th>
                <th className="py-2 pr-3">Severity</th>
                <th className="py-2 pr-3">Trend</th>
                <th className="py-2">Source</th>
                <th className="py-2">Ops severity</th>
              </tr>
            </thead>
            <tbody>
              {model.errors.map((row) => (
                <tr key={row.category} className="border-b border-bh-purple/10">
                  <td className="py-2 pr-3">{titleCaseDisplay(row.category)}</td>
                  <td className="py-2 pr-3">{titleCaseDisplay(row.productArea)}</td>
                  <td className="py-2 pr-3">{row.today === null ? "N/A" : row.today}</td>
                  <td className="py-2 pr-3">{row.open === null ? "N/A" : row.open}</td>
                  <td className="py-2 pr-3">{titleCaseDisplay(row.severity)}</td>
                  <td className="py-2 pr-3">{titleCaseDisplay(row.trend)}</td>
                  <td className="py-2">{row.source}</td>
                  <td className="py-2">{row.opsSeverity ?? "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="support">
        <h2 id="support" className="font-display text-3xl">
          6. Support
        </h2>
        <p className="mt-2 font-sans text-xs text-bh-muted">
          {model.support.publicFormDelivery} {model.support.slaStandard} Social
          handoffs from Row 83 enter the same ticket tracker.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="New today" value={count(model.support.newToday)} />
          <Metric label="Open" value={count(model.support.open)} />
          <Metric label="Resolved today" value={count(model.support.resolvedToday)} />
          <Metric
            label="Median first response (min)"
            value={
              model.support.medianResponseMinutes === null
                ? "N/A"
                : String(model.support.medianResponseMinutes)
            }
          />
          <Metric label="Approaching SLA" value={count(model.support.approachingSla)} />
          <Metric label="Overdue" value={count(model.support.overdue)} />
          <Metric label="P1 / P2 open" value={`${model.support.p1Open} / ${model.support.p2Open}`} />
          <Metric label="Urgent escalations" value={count(model.support.urgentEscalations)} />
          <Metric label="Repeat issues" value={count(model.support.repeatIssues)} />
          <Metric
            label="Social routed today / open"
            value={`${model.support.socialRoutedToday} / ${model.support.socialRoutedOpen}`}
          />
        </div>
        <ul className="mt-4 space-y-1 font-sans text-sm text-bh-muted">
          {model.support.byCategory.map((row) => (
            <li key={row.category}>
              {titleCaseDisplay(row.category)}: {row.today} today / {row.open} open
            </li>
          ))}
        </ul>
        <SupportEntryForm />
      </section>

      <section className="mt-12" aria-labelledby="risks">
        <h2 id="risks" className="font-display text-3xl">
          7. Launch Risks
        </h2>
        <p className="mt-2 font-sans text-sm text-bh-muted">
          Structured register. Errors are not auto-promoted to risks.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-bh-purple/20 text-left text-bh-muted">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Severity</th>
                <th className="py-2 pr-3">Owner</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Founder?</th>
                <th className="py-2">Mitigation</th>
              </tr>
            </thead>
            <tbody>
              {model.risks.length === 0 ? (
                <tr>
                  <td className="py-3 text-bh-muted" colSpan={9}>
                    No launch risks recorded.
                  </td>
                </tr>
              ) : (
                model.risks.map((risk) => (
                  <tr key={risk.id} className="border-b border-bh-purple/10 align-top">
                    <td className="py-2 pr-3">{risk.id}</td>
                    <td className="py-2 pr-3">{risk.dateIdentifiedEt}</td>
                    <td className="py-2 pr-3">{risk.description}</td>
                    <td className="py-2 pr-3">{titleCaseDisplay(risk.category)}</td>
                    <td className="py-2 pr-3">{risk.severity}</td>
                    <td className="py-2 pr-3">{risk.owner}</td>
                    <td className="py-2 pr-3">{titleCaseDisplay(risk.status)}</td>
                    <td className="py-2 pr-3">
                      {risk.founderEscalationRequired ? "YES" : "NO"}
                    </td>
                    <td className="py-2">{risk.mitigation}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <RiskEntryForm />
        <AvailabilityForm rows={model.availability} />
      </section>

      <section className="mt-12" aria-labelledby="freshness">
        <h2 id="freshness" className="font-display text-3xl">
          Data freshness
        </h2>
        <ul className="mt-3 space-y-2 font-sans text-sm text-bh-muted">
          {model.dataFreshness.cells.map((cell) => (
            <li key={cell.key}>
              <span className="text-bh-ink">{cell.state}</span> · {titleCaseDisplay(cell.key)}: {cell.source}. Last
              updated {cell.lastUpdated || "N/A"}. Cadence: {cell.cadence}. {cell.mode.toUpperCase()}.
              Delay: {cell.knownDelay}
            </li>
          ))}
        </ul>
        {model.qualityIssues.length ? (
          <ul className="mt-4 space-y-1 font-sans text-sm">
            {model.qualityIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 font-sans text-sm text-bh-muted">No data-quality flags.</p>
        )}
      </section>

      <section className="mt-12" aria-labelledby="brief">
        <h2 id="brief" className="font-display text-3xl">
          Daily Founder Brief
        </h2>
        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-sm border border-bh-purple/10 bg-white p-4 font-sans text-sm leading-6">
          {model.briefMarkdown}
        </pre>
      </section>
    </main>
  );
}

function DatePicker({ dateEt }: { dateEt: string }) {
  return (
    <form className="mt-4 font-sans text-sm" method="get">
      <label>
        Reporting date (ET){" "}
        <input
          type="date"
          name="date"
          defaultValue={dateEt}
          className="rounded-sm border border-bh-purple/20 bg-white px-3 py-2"
        />
      </label>
      <button type="submit" className="ml-2 underline decoration-bh-purple/30">
        View
      </button>
    </form>
  );
}

function RiskEntryForm() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/launch-dashboard/risk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        description: String(form.get("description") ?? ""),
        category: String(form.get("category") ?? ""),
        severity: String(form.get("severity") ?? ""),
        owner: String(form.get("owner") ?? ""),
        status: String(form.get("status") ?? "open"),
        mitigation: String(form.get("mitigation") ?? ""),
        founderEscalationRequired: form.get("founderEscalationRequired") === "yes",
        dateIdentifiedEt: String(form.get("dateIdentifiedEt") ?? ""),
      }),
    });
    const payload = (await response.json()) as { error?: string; id?: string };
    setStatus(response.ok ? `saved ${payload.id}` : payload.error ?? "rejected");
    if (response.ok) {
      event.currentTarget.reset();
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-3 font-sans text-sm md:grid-cols-2">
      <p className="md:col-span-2 font-medium">Add or update a launch risk</p>
      <label className="grid gap-1">
        Date identified (ET)
        <input required name="dateIdentifiedEt" type="date" className="rounded-sm border border-bh-purple/20 px-3 py-2" />
      </label>
      <label className="grid gap-1">
        Owner
        <input required name="owner" className="rounded-sm border border-bh-purple/20 px-3 py-2" />
      </label>
      <label className="grid gap-1 md:col-span-2">
        Description
        <input required name="description" className="rounded-sm border border-bh-purple/20 px-3 py-2" />
      </label>
      <label className="grid gap-1">
        Category
        <select name="category" className="rounded-sm border border-bh-purple/20 px-3 py-2">
          {RISK_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {titleCaseDisplay(value)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        Severity
        <select name="severity" className="rounded-sm border border-bh-purple/20 px-3 py-2">
          {RISK_SEVERITY.map((value) => (
            <option key={value} value={value}>
              {titleCaseDisplay(value)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        Status
        <select name="status" className="rounded-sm border border-bh-purple/20 px-3 py-2">
          {RISK_STATUS.map((value) => (
            <option key={value} value={value}>
              {titleCaseDisplay(value)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        Founder escalation
        <select name="founderEscalationRequired" className="rounded-sm border border-bh-purple/20 px-3 py-2">
          <option value="no">NO</option>
          <option value="yes">YES</option>
        </select>
      </label>
      <label className="grid gap-1 md:col-span-2">
        Mitigation / action
        <input required name="mitigation" className="rounded-sm border border-bh-purple/20 px-3 py-2" />
      </label>
      <button type="submit" className="bh-cta w-fit">
        Save risk
      </button>
      {status ? <p className="md:col-span-2 text-bh-muted">{status}</p> : null}
    </form>
  );
}

function SupportEntryForm() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/launch-dashboard/support", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        category: String(form.get("category") ?? ""),
        status: String(form.get("status") ?? "open"),
        dateEt: String(form.get("dateEt") ?? ""),
      }),
    });
    const payload = (await response.json()) as { error?: string; id?: string };
    setStatus(response.ok ? `saved ${payload.id}` : payload.error ?? "rejected");
    if (response.ok) {
      event.currentTarget.reset();
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-3 font-sans text-sm md:grid-cols-3">
      <p className="md:col-span-3 font-medium">Manual support intake (no message content)</p>
      <label className="grid gap-1">
        Date (ET)
        <input required name="dateEt" type="date" className="rounded-sm border border-bh-purple/20 px-3 py-2" />
      </label>
      <label className="grid gap-1">
        Category
        <select name="category" className="rounded-sm border border-bh-purple/20 px-3 py-2">
          {SUPPORT_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {titleCaseDisplay(value)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        Status
        <select name="status" className="rounded-sm border border-bh-purple/20 px-3 py-2">
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </label>
      <button type="submit" className="bh-cta w-fit">
        Save support record
      </button>
      {status ? <p className="md:col-span-3 text-bh-muted">{status}</p> : null}
    </form>
  );
}

function AvailabilityForm({
  rows,
}: {
  rows: LaunchDashboardModel["availability"];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/launch-dashboard/availability", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        area: String(form.get("area") ?? ""),
        status: String(form.get("status") ?? "unreported"),
        note: String(form.get("note") ?? ""),
        updatedBy: String(form.get("updatedBy") ?? "admin"),
      }),
    });
    setStatus(response.ok ? "saved" : "rejected");
    if (response.ok) router.refresh();
  }

  return (
    <div className="mt-8">
      <h3 className="font-display text-xl">Availability (automated probes + manual flags)</h3>
      <ul className="mt-3 space-y-1 font-sans text-sm text-bh-muted">
        {rows.map((row) => (
          <li key={row.area}>
            {titleCaseDisplay(row.area)}: {titleCaseDisplay(row.status)} [{(row.source ?? "manual").toUpperCase()}]
            {row.note ? ` — ${row.note}` : ""}
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3 font-sans text-sm md:grid-cols-2">
        <label className="grid gap-1">
          Area
          <select name="area" className="rounded-sm border border-bh-purple/20 px-3 py-2">
            {AVAILABILITY_AREAS.map((value) => (
              <option key={value} value={value}>
                {titleCaseDisplay(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          Status
          <select name="status" className="rounded-sm border border-bh-purple/20 px-3 py-2">
            <option value="available">Available</option>
            <option value="degraded">Degraded</option>
            <option value="unavailable">Unavailable</option>
            <option value="unreported">Unreported</option>
          </select>
        </label>
        <label className="grid gap-1">
          Updated by
          <input name="updatedBy" defaultValue="Imani Heartbeat" className="rounded-sm border border-bh-purple/20 px-3 py-2" />
        </label>
        <label className="grid gap-1">
          Note
          <input name="note" className="rounded-sm border border-bh-purple/20 px-3 py-2" />
        </label>
        <button type="submit" className="bh-cta w-fit">
          Save availability
        </button>
        {status ? <p className="text-bh-muted">{status}</p> : null}
      </form>
    </div>
  );
}
