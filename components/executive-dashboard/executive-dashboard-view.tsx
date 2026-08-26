import type { ExecutiveDashboardModel, ExecutivePanel, PanelStatus } from "@/lib/executive-dashboard/types";

function statusClass(status: PanelStatus): string {
  if (status === "RED") return "border-red-700 bg-red-50 text-red-950";
  if (status === "YELLOW") return "border-amber-600 bg-amber-50 text-amber-950";
  if (status === "N/A") return "border-bh-purple/15 bg-bh-cream/60 text-bh-ink";
  return "border-bh-purple/10 bg-white text-bh-ink";
}

function healthClass(health: string): string {
  if (health === "RED") return "border-red-700 bg-red-50 text-red-900";
  if (health === "YELLOW") return "border-amber-600 bg-amber-50 text-amber-950";
  return "border-emerald-700 bg-emerald-50 text-emerald-950";
}

function PanelCard({ panel }: { panel: ExecutivePanel }) {
  return (
    <section
      id={panel.id}
      data-panel-id={panel.id}
      data-panel-status={panel.status}
      className={`rounded-sm border px-5 py-4 ${statusClass(panel.status)}`}
      aria-labelledby={`${panel.id}-title`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id={`${panel.id}-title`} className="font-display text-xl">
          {panel.title}
        </h2>
        <p className="font-sans text-[11px] uppercase tracking-[0.14em]">{panel.status}</p>
      </div>
      <p className="mt-2 font-sans text-sm font-light">{panel.summary}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {panel.metrics.map((metric) => (
          <div key={metric.label} className="rounded-sm border border-current/10 bg-white/70 px-3 py-2">
            <p className="font-sans text-[11px] uppercase tracking-[0.14em] opacity-70">
              {metric.label}
            </p>
            <p className="mt-1 font-display text-xl">{metric.value}</p>
            {metric.hint ? (
              <p className="mt-1 font-sans text-xs opacity-70">{metric.hint}</p>
            ) : null}
          </div>
        ))}
      </div>
      {panel.issues.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 font-sans text-sm">
          {panel.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 font-sans text-xs opacity-70">
        {panel.sourceLabel}
        {" · "}
        <a href={panel.investigateHref} className="underline decoration-current/30">
          Investigate
        </a>
      </p>
    </section>
  );
}

export function ExecutiveDashboardView({
  model,
  reviewBanner,
}: {
  model: ExecutiveDashboardModel;
  reviewBanner?: string;
}) {
  return (
    <main
      className="mx-auto max-w-6xl px-6 py-12 text-bh-ink"
      data-bh-executive-dashboard="row-209"
    >
      {reviewBanner ? (
        <p className="mb-4 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          {reviewBanner}
        </p>
      ) : null}
      <p className="font-sans text-xs uppercase tracking-[0.18em] text-bh-muted">
        Row 209 · Launch-Day Executive Dashboard
      </p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.02em]">
        Launch-day executive view
      </h1>
      <p className="mt-3 max-w-3xl font-sans text-base font-light text-bh-muted">
        One Founder screen for enrollment, traffic, production, payments, access, Lumina,
        support, marketing, incidents, and decisions. This view composes existing systems. It
        does not replace Row 151 investigation, Row 84 marketing detail, or Agent Operations.
      </p>
      <p className="mt-4 font-sans text-sm">
        <a href="/ops/admin" className="underline decoration-bh-purple/30">
          Admin
        </a>
        {" · "}
        <a href="/ops/admin/launch-dashboard" className="underline decoration-bh-purple/30">
          Daily Launch Dashboard
        </a>
        {" · "}
        <a href="/ops/admin/launch-kpi" className="underline decoration-bh-purple/30">
          Marketing KPI
        </a>
        {" · "}
        <a href="/ops/admin/agent-operations" className="underline decoration-bh-purple/30">
          Agent Operations
        </a>
        {" · "}
        <a href="/ops/admin/support" className="underline decoration-bh-purple/30">
          Support
        </a>
      </p>

      <section
        className={`mt-8 rounded-sm border px-5 py-4 ${healthClass(model.launchHealth)}`}
        aria-labelledby="exec-strip"
        data-founder-attention={model.founderAttentionRequired ? "yes" : "no"}
      >
        <h2 id="exec-strip" className="font-display text-2xl">
          Launch Health: {model.launchHealth}
        </h2>
        <p className="mt-2 font-sans text-sm">
          Executive status: {model.executiveStatus} · Today (ET): {model.dateEt} ·{" "}
          {model.launchLabel} · {model.launchDayNumber}
        </p>
        <p className="mt-1 font-sans text-sm">
          Last updated: {model.dataFreshness}
          {model.viewingFrozenSnapshot ? " · viewing frozen daily snapshot" : ""}
        </p>
        <p className="mt-1 font-sans text-sm">
          Critical issues open: {model.criticalIssuesOpen}
          {model.monitoringAvailable ? "" : " · Row 61 snapshot N/A"}
        </p>
        <p className="mt-1 font-sans text-sm font-medium">
          Founder attention required: {model.founderAttentionRequired ? "YES" : "NO"}
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 font-sans text-sm">
          {model.founderAttentionReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </section>

      {model.decisions.length > 0 ? (
        <section className="mt-8 rounded-sm border border-bh-purple/15 bg-white px-5 py-4" aria-labelledby="open-decisions">
          <h2 id="open-decisions" className="font-display text-2xl">
            Open Founder decisions
          </h2>
          <ul className="mt-4 space-y-3">
            {model.decisions.map((decision) => (
              <li key={decision.decisionId} className="rounded-sm border border-bh-purple/10 px-4 py-3">
                <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-bh-muted">
                  {decision.severity} · {decision.requestingAgent}
                </p>
                <p className="mt-1 font-display text-lg">{decision.decisionRequired}</p>
                <p className="mt-1 font-sans text-sm font-light text-bh-muted">
                  Risk if delayed: {decision.riskIfDelayed}
                  {decision.deadline ? ` · Deadline ${decision.deadline}` : ""}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-sans text-xs text-bh-muted">
            Approve / Reject / Review remains on{" "}
            <a href="/ops/admin/agent-operations" className="underline decoration-bh-purple/30">
              Agent Operations
            </a>
            . This page does not execute Founder decisions.
          </p>
        </section>
      ) : null}

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {model.panels.map((panel) => (
          <PanelCard key={panel.id} panel={panel} />
        ))}
      </div>
    </main>
  );
}
