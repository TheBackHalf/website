import { FounderDecisionActions } from "@/components/ops/founder-decision-actions";
import type { AgentOperationsSnapshot } from "@/lib/fab-5/aos/snapshot";

function stamp(value: string | null): string {
  if (!value) return "No heartbeat yet";
  return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function WorkList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ workId: string; title: string; status: string }>;
  empty: string;
}) {
  return (
    <div className="mt-5">
      <h3 className="font-sans text-[11px] uppercase tracking-[0.14em] text-bh-muted">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 font-sans text-sm font-light text-bh-muted">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item.workId} className="rounded-sm border border-bh-purple/10 px-3 py-2">
              <p className="font-sans text-sm text-bh-ink">{item.title}</p>
              <p className="mt-1 font-sans text-xs text-bh-muted">
                {item.status} · {item.workId}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AgentOperationsView({ snapshot }: { snapshot: AgentOperationsSnapshot }) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12 text-bh-ink">
      <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-bh-muted">
        Permanent operating system
      </p>
      <h1 className="mt-2 font-display text-4xl font-medium tracking-[-0.02em]">
        Agent Operations
      </h1>
      <p className="mt-3 max-w-2xl font-sans text-base font-light text-bh-muted">
        Michelle, Imani, and Nia are the autonomous operating executives. Kimberly Walker (AI)
        is not execution capacity. Founder decisions appear here instead of in agent logs.
      </p>
      <p className="mt-4 font-sans text-sm">
        <a href="/ops/admin" className="underline decoration-bh-purple/30">
          Admin
        </a>
        {" · "}
        <a href="/ops/admin/launch-dashboard" className="underline decoration-bh-purple/30">
          Daily Launch Dashboard
        </a>
      </p>

      <section className="mt-10 rounded-sm border border-bh-purple/15 bg-white px-5 py-5">
        <h2 className="font-display text-2xl">Founder decisions waiting</h2>
        {snapshot.founderDecisions.length === 0 ? (
          <p className="mt-3 font-sans text-sm font-light text-bh-muted">None.</p>
        ) : (
          <ul className="mt-4 space-y-6">
            {snapshot.founderDecisions.map((decision) => (
              <li key={decision.decisionId} className="border-t border-bh-purple/10 pt-4 first:border-t-0 first:pt-0">
                <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-bh-muted">
                  Founder decision required · {decision.severity} · {decision.requestingAgent}
                </p>
                <p className="mt-2 font-display text-xl">{decision.decisionRequired}</p>
                <p className="mt-2 font-sans text-sm">{decision.agentRecommendation}</p>
                <p className="mt-2 font-sans text-sm font-light text-bh-muted">{decision.reason}</p>
                <p className="mt-2 font-sans text-xs text-bh-muted">
                  Risk if delayed: {decision.riskIfDelayed}
                  {decision.deadline ? ` · Deadline: ${decision.deadline}` : ""}
                </p>
                <FounderDecisionActions decision={decision} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded-sm border border-bh-purple/15 bg-white px-5 py-5">
        <h2 className="font-display text-2xl">Engineering jobs</h2>
        <p className="mt-2 font-sans text-sm font-light text-bh-muted">
          Programmatic Cursor Cloud Agents. Isolated branches. No merge without validation. Founder
          acceptance stays with Kimberly Walker (human).
        </p>
        {snapshot.engineeringJobs.length === 0 ? (
          <p className="mt-3 font-sans text-sm font-light text-bh-muted">None recorded.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {snapshot.engineeringJobs.map((job) => (
              <li key={job.jobId} className="rounded-sm border border-bh-purple/10 px-3 py-2">
                <p className="font-sans text-sm text-bh-ink">
                  {job.ownerAgent} · {job.status} · {job.workId}
                </p>
                <p className="mt-1 font-sans text-xs text-bh-muted">
                  {job.provider}
                  {job.providerAgentId ? ` · ${job.providerAgentId}` : ""}
                  {job.branch ? ` · ${job.branch}` : ""}
                  {job.prUrl ? ` · PR recorded` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        {snapshot.agents.map((column) => (
          <article key={column.agent} className="rounded-sm border border-bh-purple/10 bg-white px-5 py-5">
            <h2 className="font-display text-2xl">{column.name}</h2>
            <p className="mt-1 font-sans text-sm font-light text-bh-muted">{column.role}</p>
            <p className="mt-3 font-sans text-xs text-bh-muted">Last heartbeat: {stamp(column.lastHeartbeat)}</p>
            <p className="mt-1 font-sans text-xs text-bh-muted">
              Active: {column.currentWork?.title ?? "Idle"} · Failed: {column.failed}
            </p>
            <WorkList title="Queue" items={column.queue} empty="No executable work waiting." />
            <WorkList title="Blocked" items={column.blocked} empty="Nothing blocked." />
            <WorkList
              title="Recently completed"
              items={column.recentlyCompleted}
              empty="No recent completions."
            />
          </article>
        ))}
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-sm border border-bh-purple/10 px-5 py-5">
          <h2 className="font-display text-2xl">Date-gated / overdue</h2>
          {snapshot.overdueDateGated.length === 0 ? (
            <p className="mt-3 font-sans text-sm font-light text-bh-muted">None overdue.</p>
          ) : (
            <ul className="mt-3 space-y-2 font-sans text-sm">
              {snapshot.overdueDateGated.map((item) => (
                <li key={item.workId}>{item.title}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-sm border border-bh-purple/10 px-5 py-5">
          <h2 className="font-display text-2xl">Cross-agent dependencies</h2>
          {snapshot.dependencies.length === 0 ? (
            <p className="mt-3 font-sans text-sm font-light text-bh-muted">None open.</p>
          ) : (
            <ul className="mt-3 space-y-2 font-sans text-sm">
              {snapshot.dependencies.map((item) => (
                <li key={item.workId}>
                  {item.owner} {item.workId} waiting on {item.waitingOn.join(", ")}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
