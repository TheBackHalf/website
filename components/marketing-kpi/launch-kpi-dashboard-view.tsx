import { DailyReportPanel } from "@/components/marketing-kpi/daily-report-panel";
import { SocialMetricsEntryForm } from "@/components/marketing-kpi/social-metrics-entry-form";
import {
  formatCount,
  formatRate,
  formatUsdFromCents,
  type LaunchKpiDashboardModel,
} from "@/lib/marketing-kpi/aggregate";
import { KPI_DICTIONARY } from "@/lib/marketing-kpi/dictionary";
import { PUBLIC_DESTINATION_HOST } from "@/lib/marketing-kpi/attribution";
import { HISTORICAL_EXCLUSION_LABEL } from "@/lib/marketing-kpi/period";

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

function MetricCard({
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
      <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-bh-muted">{label}</p>
      <p className="mt-2 font-display text-2xl text-bh-ink">{value}</p>
      {hint ? <p className="mt-1 font-sans text-xs text-bh-muted">{hint}</p> : null}
    </div>
  );
}

export function LaunchKpiDashboardView({
  model,
}: {
  model: LaunchKpiDashboardModel;
}) {
  const t = model.totals;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 text-bh-ink">
      <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
        The Back Half Social Launch
      </h1>
      <p className="mt-3 max-w-3xl font-sans text-base font-light text-bh-muted">
        THE QUESTION · August 28–31, 2026 · Destination {PUBLIC_DESTINATION_HOST}
      </p>
      <p className="mt-2 font-sans text-xs text-bh-muted">
        Required launch channels: Instagram and TikTok. LinkedIn is a future
        enhancement and is not required for launch KPI reporting.
      </p>
      <p className="mt-2 font-sans text-xs text-bh-muted">
        Last updated {model.lastUpdatedAt}. This is not implied real-time reporting.
      </p>
      <p className="mt-1 font-sans text-xs text-bh-muted">
        {model.dataFreshness.websiteEvents} · {model.dataFreshness.socialManual} ·{" "}
        {model.dataFreshness.stripePurchases}
      </p>

      <section className="mt-10" aria-labelledby="reporting-boundary">
        <h2 id="reporting-boundary" className="font-display text-3xl">
          Launch measurement boundary
        </h2>
        <p className="mt-2 font-sans text-sm text-bh-muted">
          Campaign measurement begins {model.reportingBoundary.campaignStartEt}.
          Launch Day is {model.reportingBoundary.launchDayEt}. Timezone{" "}
          {model.reportingBoundary.timezone}. Launch KPIs start at{" "}
          {model.reportingBoundary.launchStartPurchases} purchases /{" "}
          {formatUsdFromCents(model.reportingBoundary.launchStartRevenueCents)}{" "}
          before qualifying August 28 activity.
        </p>
        <p className="mt-2 font-sans text-xs text-bh-muted">
          Durable store: {model.durability.productionSourceOfTruth}. Local{" "}
          <code>.data/</code> is not the production source of truth.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-sm border border-bh-purple/15 bg-bh-cream/40 px-4 py-4">
            <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-bh-muted">
              {model.periods.preLaunchHistorical.label}
            </p>
            <p className="mt-2 font-display text-2xl text-bh-ink">
              {model.periods.preLaunchHistorical.purchases} Purchases
            </p>
            <p className="mt-1 font-sans text-sm text-bh-muted">
              {formatUsdFromCents(model.periods.preLaunchHistorical.revenueCents)} recorded
            </p>
            <p className="mt-2 font-sans text-xs font-medium text-bh-ink">
              {HISTORICAL_EXCLUSION_LABEL}
            </p>
            <p className="mt-1 font-sans text-xs text-bh-muted">
              These are not August 28–31 campaign purchases, launch-day purchases,
              launch revenue, or launch conversion.
            </p>
          </div>
          <div className="rounded-sm border-2 border-bh-purple/40 bg-white px-4 py-4">
            <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-bh-purple">
              {model.periods.launchCampaign.label}
            </p>
            <p className="mt-2 font-display text-2xl text-bh-ink">
              Launch Purchases: {model.periods.launchCampaign.purchases}
            </p>
            <p className="mt-1 font-display text-xl text-bh-ink">
              Launch Revenue: {formatUsdFromCents(model.periods.launchCampaign.revenueCents)}
            </p>
            <p className="mt-2 font-sans text-xs text-bh-muted">
              Checkout starts {model.periods.launchCampaign.checkoutStarts} · Landing-page
              sessions {model.periods.launchCampaign.landingPageSessions}
            </p>
          </div>
          <div className="rounded-sm border border-bh-purple/15 bg-white px-4 py-4">
            <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-bh-muted">
              {model.periods.postLaunch.label}
            </p>
            <p className="mt-2 font-display text-2xl text-bh-ink">
              {model.periods.postLaunch.purchases} Purchases
            </p>
            <p className="mt-1 font-sans text-sm text-bh-muted">
              {formatUsdFromCents(model.periods.postLaunch.revenueCents)}
            </p>
            <p className="mt-2 font-sans text-xs text-bh-muted">
              Continuing reporting after August 31. Not mixed into campaign totals.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="founder-view">
        <h2 id="founder-view" className="font-display text-3xl">
          Founder executive view
        </h2>
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="font-sans text-sm font-medium">Are people seeing us?</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Reach" value={formatCount(t.reach)} />
              <MetricCard label="Impressions / views" value={formatCount(t.impressions)} />
              <MetricCard label="Follower growth" value={formatCount(t.followerGrowth)} />
            </div>
          </div>
          <div>
            <h3 className="font-sans text-sm font-medium">Are people responding?</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <MetricCard label="Engagements" value={formatCount(t.engagements)} />
              <MetricCard
                label="Engagement rate"
                value={formatRate(t.engagementRate)}
                hint="engagements ÷ impressions"
              />
            </div>
          </div>
          <div>
            <h3 className="font-sans text-sm font-medium">Are people taking action?</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <MetricCard label="Link clicks" value={formatCount(t.linkClicks)} />
              <MetricCard label="Landing-page sessions" value={String(t.landingPageSessions)} />
            </div>
          </div>
          <div>
            <h3 className="font-sans text-sm font-medium">Are people entering the funnel?</h3>
            <div className="mt-3">
              <MetricCard label="Checkout starts" value={String(t.checkoutStarts)} />
            </div>
          </div>
          <div>
            <h3 className="font-sans text-sm font-medium">Are people becoming Architects?</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="Launch Purchases"
                value={String(t.purchases)}
                hint="LAUNCH CAMPAIGN only — historical 19 excluded"
              />
              <MetricCard
                label="Launch Revenue"
                value={formatUsdFromCents(model.funnel.revenueCents)}
                hint="LAUNCH CAMPAIGN only"
              />
              <MetricCard
                label="Purchase conversion"
                value={formatRate(t.rates.purchaseConversion)}
                hint="launch purchases ÷ launch landing-page sessions"
              />
            </div>
          </div>
        </div>
        <p className="mt-4 font-sans text-sm text-bh-muted">
          Email signups: {model.emailSignups.status}
        </p>
      </section>

      <section className="mt-12" aria-labelledby="funnel">
        <h2 id="funnel" className="font-display text-3xl">
          Launch funnel
        </h2>
        <p className="mt-2 font-sans text-sm text-bh-muted">
          REACH → ENGAGEMENT → LINK CLICK → LANDING-PAGE SESSION → CHECKOUT START → PURCHASE
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Reach" value={formatCount(model.funnel.reach)} />
          <MetricCard label="Engagement" value={formatCount(model.funnel.engagements)} />
          <MetricCard label="Link click" value={formatCount(model.funnel.linkClicks)} />
          <MetricCard label="Landing-page session" value={String(model.funnel.landingPageSessions)} />
          <MetricCard label="Checkout start" value={String(model.funnel.checkoutStarts)} />
          <MetricCard label="Purchase" value={String(model.funnel.purchases)} hint="LAUNCH CAMPAIGN" />
        </div>
        <ul className="mt-4 space-y-1 font-sans text-sm text-bh-muted">
          <li>Click-through rate (link clicks ÷ impressions): {formatRate(model.funnel.rates.clickThroughRate)}</li>
          <li>
            Landing-page continuation (sessions ÷ link clicks):{" "}
            {formatRate(model.funnel.rates.landingContinuation)}
          </li>
          <li>
            Checkout-start rate (starts ÷ landing-page sessions):{" "}
            {formatRate(model.funnel.rates.checkoutStartRate)}
          </li>
          <li>
            Purchase conversion (purchases ÷ landing-page sessions):{" "}
            {formatRate(model.funnel.rates.purchaseConversion)}
          </li>
          <li>
            Checkout completion (purchases ÷ checkout starts):{" "}
            {formatRate(model.funnel.rates.checkoutCompletion)}
          </li>
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="channels">
        <h2 id="channels" className="font-display text-3xl">
          Which channel is working?
        </h2>
        <p className="mt-2 font-sans text-sm text-bh-muted">
          Required launch reporting channels: Instagram and TikTok. LinkedIn is a
          future enhancement and is not required for launch KPI reporting.
          Historical LinkedIn rows remain visible if present.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-bh-purple/15 text-left text-bh-muted">
                <th className="py-2 pr-4">Channel</th>
                <th className="py-2 pr-4">Reach</th>
                <th className="py-2 pr-4">Impressions</th>
                <th className="py-2 pr-4">Engagements</th>
                <th className="py-2 pr-4">Link clicks</th>
                <th className="py-2 pr-4">Landing sessions</th>
                <th className="py-2 pr-4">Checkout starts</th>
                <th className="py-2 pr-4">Purchases</th>
                <th className="py-2 pr-4">Purchase conversion</th>
              </tr>
            </thead>
            <tbody>
              {model.channels.map((channel) => (
                <tr key={channel.channel} className="border-b border-bh-purple/10">
                  <td className="py-2 pr-4">
                    {titleCaseDisplay(channel.channel)}
                    {channel.channel === "linkedin"
                      ? " (future enhancement — not required)"
                      : ""}
                  </td>
                  <td className="py-2 pr-4">{formatCount(channel.reach)}</td>
                  <td className="py-2 pr-4">{formatCount(channel.impressions)}</td>
                  <td className="py-2 pr-4">{formatCount(channel.engagements)}</td>
                  <td className="py-2 pr-4">{formatCount(channel.linkClicks)}</td>
                  <td className="py-2 pr-4">{channel.landingPageSessions}</td>
                  <td className="py-2 pr-4">{channel.checkoutStarts}</td>
                  <td className="py-2 pr-4">{channel.purchases}</td>
                  <td className="py-2 pr-4">{formatRate(channel.rates.purchaseConversion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="daily">
        <h2 id="daily" className="font-display text-3xl">
          What changed today?
        </h2>
        <p className="mt-2 font-sans text-sm text-bh-muted">
          Daily rows begin August 28. Pre-campaign days are not invented.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-bh-purple/15 text-left text-bh-muted">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Sessions</th>
                <th className="py-2 pr-4">Checkout starts</th>
                <th className="py-2 pr-4">Purchases</th>
                <th className="py-2 pr-4">Δ sessions vs prior day</th>
                <th className="py-2 pr-4">Launch purchases vs start (0)</th>
              </tr>
            </thead>
            <tbody>
              {model.days.map((day) => (
                <tr key={day.dateEt} className="border-b border-bh-purple/10">
                  <td className="py-2 pr-4">
                    {day.dateEt}
                    <span className="block text-xs text-bh-muted">{day.label}</span>
                  </td>
                  <td className="py-2 pr-4">{day.totals.landingPageSessions}</td>
                  <td className="py-2 pr-4">{day.totals.checkoutStarts}</td>
                  <td className="py-2 pr-4">{day.totals.purchases}</td>
                  <td className="py-2 pr-4">
                    {day.vsPriorDay.landingPageSessions ?? "N/A"}
                  </td>
                  <td className="py-2 pr-4">{day.vsBaseline.purchases ?? "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="assets">
        <h2 id="assets" className="font-display text-3xl">
          Asset-level performance
        </h2>
        <p className="mt-2 font-sans text-sm text-bh-muted">
          First-party attribution uses utm_content = Row 81 asset ID. Native post-level
          engagement is N/A unless the platform export is entered separately.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-bh-purple/15 text-left text-bh-muted">
                <th className="py-2 pr-4">Asset</th>
                <th className="py-2 pr-4">Channel</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Landing sessions</th>
                <th className="py-2 pr-4">Checkout starts</th>
                <th className="py-2 pr-4">Purchases</th>
              </tr>
            </thead>
            <tbody>
              {model.assets.map((asset) => (
                <tr key={asset.assetId} className="border-b border-bh-purple/10">
                  <td className="py-2 pr-4">{asset.assetId}</td>
                  <td className="py-2 pr-4">{titleCaseDisplay(asset.channel)}</td>
                  <td className="py-2 pr-4">{asset.dateEt}</td>
                  <td className="py-2 pr-4">{asset.landingPageSessions}</td>
                  <td className="py-2 pr-4">{asset.checkoutStarts}</td>
                  <td className="py-2 pr-4">{asset.purchases}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="baseline">
        <h2 id="baseline" className="font-display text-3xl">
          PRE-LAUNCH BASELINE / HISTORICAL
        </h2>
        <p className="mt-2 font-sans text-sm text-bh-muted">
          Captured {model.baseline.baselineDate} ET · retrieved {model.baseline.retrievedAt}.{" "}
          {HISTORICAL_EXCLUSION_LABEL}.
        </p>
        <ul className="mt-4 space-y-1 font-sans text-sm">
          {(["instagram", "linkedin", "tiktok"] as const).map((channel) => (
            <li key={channel}>
              <strong>{titleCaseDisplay(channel)}</strong>
              {channel === "linkedin" ? " (future enhancement — not required)" : ""}{" "}
              Followers: {formatCount(model.baseline.channels[channel].followers.value)} (
              {model.baseline.channels[channel].followers.status})
            </li>
          ))}
          <li>
            Website traffic: {model.baseline.websiteTraffic.status}
          </li>
          <li>
            Registration-page traffic: {formatCount(model.baseline.registrationPageTraffic.value)} (
            {model.baseline.registrationPageTraffic.status})
          </li>
          <li>
            Checkout starts: {formatCount(model.baseline.checkoutStarts.value)} (
            {model.baseline.checkoutStarts.status})
          </li>
          <li>
            Historical paid purchases: {formatCount(model.baseline.purchases.value)} (
            {model.baseline.purchases.status}) — {HISTORICAL_EXCLUSION_LABEL}. This is not
            19 launch conversions.
          </li>
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="quality">
        <h2 id="quality" className="font-display text-3xl">
          Data-quality flags
        </h2>
        {model.issues.length === 0 ? (
          <p className="mt-3 font-sans text-sm text-bh-muted">No issues on current data.</p>
        ) : (
          <ul className="mt-3 space-y-1 font-sans text-sm">
            {model.issues.slice(0, 40).map((issue, index) => (
              <li key={`${issue.code}-${index}`}>
                <span className="uppercase">{issue.severity}</span> — {issue.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12" aria-labelledby="manual">
        <h2 id="manual" className="font-display text-3xl">
          Manual native-analytics entry
        </h2>
        <p className="mt-2 max-w-3xl font-sans text-sm text-bh-muted">
          Nia pulls Instagram and TikTok insights after the platform refresh
          (typically next morning). LinkedIn entry remains available for later use
          and is not required for launch reporting. A person with admin access
          enters the numbers here. Leave a field blank for N/A — Not Available
          From Source. Do not estimate.
        </p>
        <SocialMetricsEntryForm />
      </section>

      <section className="mt-12" aria-labelledby="report">
        <h2 id="report" className="font-display text-3xl">
          Daily launch report
        </h2>
        <p className="mt-2 font-sans text-sm text-bh-muted">
          Generated from dashboard data. Do not reconstruct numbers by hand.
        </p>
        <DailyReportPanel />
      </section>

      <section className="mt-12" aria-labelledby="dictionary">
        <h2 id="dictionary" className="font-display text-3xl">
          KPI dictionary
        </h2>
        <div className="mt-4 space-y-4">
          {KPI_DICTIONARY.map((kpi) => (
            <article
              key={kpi.id}
              className="rounded-sm border border-bh-purple/10 bg-white px-4 py-3 font-sans text-sm"
            >
              <h3 className="font-medium">{kpi.name}</h3>
              <p className="mt-1 text-bh-muted">{kpi.definition}</p>
              <p className="mt-1">Formula: {kpi.formula}</p>
              <p>Source: {kpi.sourceSystem}</p>
              <p>Owner: {kpi.owner === "n/a" ? "N/A" : kpi.owner}</p>
              <p className="text-bh-muted">Limitation: {kpi.limitation}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
