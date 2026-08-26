import type { LaunchDashboardModel } from "@/lib/launch-dashboard/types";

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function rate(value: number | null, extra: string): string {
  if (value === null) return `n/a (${extra})`;
  return `${(value * 100).toFixed(1)}% (${extra})`;
}

function movement(today: number | null, versus: number | null): string {
  if (today === null) return "n/a";
  if (versus === null) return `${today} today`;
  const sign = versus > 0 ? "+" : "";
  return `${today} today (${sign}${versus} vs prior day)`;
}

export function buildDailyFounderBrief(
  model: Omit<LaunchDashboardModel, "briefMarkdown">,
): string {
  const materialErrors = model.errors.filter(
    (row) => (row.today ?? 0) > 0 && row.severity !== "GREEN",
  );
  const openRisks = model.risks.filter(
    (risk) => risk.status !== "resolved" && risk.severity !== "GREEN",
  );
  const action = model.founderAttentionRequired
    ? model.founderReasons.join(" ")
    : "No Founder action required.";

  const biggestDrop = [...model.conversion.dropOff].sort(
    (a, b) => b.lost - a.lost,
  )[0];

  return [
    "# THE BACK HALF — DAILY LAUNCH BRIEF",
    "",
    `**Date:** ${model.dateEt} (${model.launchLabel})`,
    `**Launch Health:** ${model.health}`,
    `**Founder Attention Required:** ${model.founderAttentionRequired ? "YES" : "NO"}`,
    "",
    "### TRAFFIC",
    `Website sessions ${movement(model.traffic.websiteSessions.today, model.traffic.websiteSessions.versusPriorDay)}. Registration-page sessions ${model.traffic.registrationPageSessions.today} (Row 84). Top source: ${model.traffic.topSource}. Campaign page views today: ${model.traffic.campaignSessions.today}.`,
    "",
    "### CONVERSION",
    `Registration started ${model.conversion.registrationStarted} → completed ${model.conversion.registrationCompleted} (${rate(model.conversion.registrationConversion.value, "succeeded ÷ started")}). Become an Architect CTA ${model.conversion.becomeArchitectCta}. Checkout started ${model.conversion.checkoutStarted}. Purchases ${model.conversion.purchases} (${rate(model.conversion.landingToPurchase.value, "paid purchases ÷ landing-page sessions")}; ${rate(model.conversion.checkoutCompletion.value, "paid purchases ÷ checkout started")}). Largest drop-off: ${biggestDrop ? `${biggestDrop.from} → ${biggestDrop.to} (${biggestDrop.lost})` : "none"}.`,
    "",
    "### REVENUE",
    `Today ${money(model.revenue.grossTodayCents)} gross / ${money(model.revenue.netTodayCents)} net · ${model.revenue.purchasesToday} purchases. Cumulative ${money(model.revenue.grossCumulativeCents)} gross / ${money(model.revenue.netCumulativeCents)} net · ${model.revenue.purchasesCumulative} purchases. ${model.revenue.refundsNote} Source: billing store.`,
    "",
    "### ACTIVATION",
    `${model.activation.activated} activated of ${model.activation.purchased} purchasers (${rate(model.activation.activationRate.value, "started onboarding ÷ paid purchasers")}). Purchased not activated: ${model.activation.purchasedNotActivated}. Lumina opened today ${model.activation.luminaOpenedToday}. Downloads completed today ${model.activation.downloadsCompletedToday}. Journey completed ${model.activation.journeyCompleted}. ${model.activation.definition}`,
    "",
    "### ERRORS",
    materialErrors.length
      ? materialErrors
          .map((row) => `${row.category}: ${row.today} today (${row.productArea}).`)
          .join(" ")
      : "No material error volume today.",
    "",
    "### SUPPORT",
    `New ${model.support.newToday}. Open ${model.support.open}. Resolved today ${model.support.resolvedToday}. Approaching ${model.support.slaStandard.split(":")[0]}: ${model.support.approachingSla}. Social routed (Row 83, not double-counted): ${model.support.socialRoutedToday} today / ${model.support.socialRoutedOpen} open. ${model.support.publicFormDelivery}`,
    "",
    "### LAUNCH RISKS",
    openRisks.length
      ? openRisks
          .map(
            (risk) =>
              `${risk.id} ${risk.severity} ${risk.category} (${risk.status}) owner ${risk.owner}.`,
          )
          .join(" ")
      : "No open YELLOW/RED risks.",
    "",
    "### ACTION REQUIRED",
    action,
    "",
    `_Generated ${model.generatedAt} from launch dashboard sources. Not reconstructed from memory._`,
    "",
  ].join("\n");
}
