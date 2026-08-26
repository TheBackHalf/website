import { formatCount, formatRate, formatUsdFromCents } from "@/lib/marketing-kpi/aggregate";
import type { LaunchKpiDashboardModel } from "@/lib/marketing-kpi/aggregate";
import type { FounderDecision } from "@/lib/fab-5/aos/types";
import type { LaunchDashboardModel } from "@/lib/launch-dashboard/types";
import type { ProductionMonitoringSnapshot } from "@/lib/monitoring/types";
import {
  EXECUTIVE_PANEL_IDS,
  type ExecutiveDashboardModel,
  type ExecutiveDecisionCard,
  type ExecutivePanel,
  type PanelStatus,
} from "@/lib/executive-dashboard/types";

const LAUNCH_DAY_ET = "2026-08-31";

function money(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "N/A";
  return formatUsdFromCents(cents);
}

function count(value: number | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  return String(value);
}

function rate(value: number | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}

export function worstPanelStatus(statuses: PanelStatus[]): PanelStatus {
  if (statuses.includes("RED")) return "RED";
  if (statuses.includes("YELLOW")) return "YELLOW";
  const known = statuses.filter((status) => status !== "N/A");
  if (known.length === 0) return "N/A";
  return "GREEN";
}

function monitoringStatus(value: "PASS" | "FAIL" | "DEGRADED" | undefined): PanelStatus {
  if (!value) return "N/A";
  if (value === "FAIL") return "RED";
  if (value === "DEGRADED") return "YELLOW";
  return "GREEN";
}

function errorToday(launch: LaunchDashboardModel, category: string): number | null {
  const row = launch.errors.find((entry) => entry.category === category);
  return row?.today ?? null;
}

function availabilityStatus(
  launch: LaunchDashboardModel,
  area: LaunchDashboardModel["availability"][number]["area"],
): string {
  return launch.availability.find((row) => row.area === area)?.status ?? "unreported";
}

function isLaunchDayOrAfter(dateEt: string): boolean {
  return dateEt >= LAUNCH_DAY_ET;
}

function enrollmentPanel(launch: LaunchDashboardModel): ExecutivePanel {
  const paymentDown = availabilityStatus(launch, "payment") === "unavailable";
  const billingError = launch.qualityIssues.some((issue) =>
    /billing|revenue|purchase/i.test(issue),
  );
  const launchDayNoSales =
    isLaunchDayOrAfter(launch.dateEt) &&
    launch.conversion.checkoutStarted > 0 &&
    launch.revenue.purchasesToday === 0 &&
    launch.revenue.failedPaymentsToday > 0;
  const status = paymentDown
    ? "RED"
    : billingError || launchDayNoSales
      ? "YELLOW"
      : "GREEN";
  const issues = [
    ...launch.qualityIssues.filter((issue) => /billing|revenue|purchase/i.test(issue)),
    ...(launchDayNoSales
      ? ["Launch-day checkout starts with failed payments and zero paid purchases."]
      : []),
  ];
  return {
    id: "enrollment-revenue",
    title: "Enrollment / revenue",
    status,
    summary: `${count(launch.revenue.purchasesToday)} paid purchase(s) today · ${money(launch.revenue.grossTodayCents)} gross. Cumulative launch ${count(launch.revenue.purchasesCumulative)} / ${money(launch.revenue.grossCumulativeCents)}. ${count(launch.activation.activated)} Activated Architect(s).`,
    metrics: [
      {
        label: "Purchases today",
        value: count(launch.revenue.purchasesToday),
        hint: `Cumulative ${count(launch.revenue.purchasesCumulative)}`,
      },
      {
        label: "Gross revenue today",
        value: money(launch.revenue.grossTodayCents),
        hint: `Cumulative ${money(launch.revenue.grossCumulativeCents)}`,
      },
      {
        label: "Activated Architects",
        value: count(launch.activation.activated),
        hint: launch.activation.definition,
      },
      {
        label: "Historical purchases",
        value: count(launch.revenue.historicalPurchases),
        hint: launch.revenue.historicalLabel,
      },
    ],
    sourceLabel: `Row 151 / billing · ${launch.revenue.source}`,
    investigateHref: "/ops/admin/launch-dashboard",
    issues,
  };
}

function trafficPanel(launch: LaunchDashboardModel): ExecutivePanel {
  const noTraffic =
    isLaunchDayOrAfter(launch.dateEt) && (launch.traffic.websiteSessions.today ?? 0) === 0;
  return {
    id: "traffic-conversion",
    title: "Traffic / conversion",
    status: noTraffic ? "YELLOW" : "GREEN",
    summary: `${count(launch.traffic.websiteSessions.today)} website session(s) today. Registration conversion ${rate(launch.conversion.registrationConversion.value)}. Landing → purchase ${rate(launch.conversion.landingToPurchase.value)}.`,
    metrics: [
      {
        label: "Website sessions today",
        value: count(launch.traffic.websiteSessions.today),
        hint: `vs prior day ${count(launch.traffic.websiteSessions.versusPriorDay)}`,
      },
      {
        label: "Unique visitors today",
        value: count(launch.traffic.uniqueVisitors.today),
      },
      {
        label: "Registration conversion",
        value: rate(launch.conversion.registrationConversion.value),
        hint: launch.conversion.registrationConversion.label,
      },
      {
        label: "Checkout completion",
        value: rate(launch.conversion.checkoutCompletion.value),
        hint: `${count(launch.conversion.purchases)} paid ÷ ${count(launch.conversion.checkoutStarted)} checkout starts`,
      },
    ],
    sourceLabel: "Row 150 analytics + Row 84 landing sessions",
    investigateHref: "/ops/admin/launch-dashboard",
    issues: noTraffic ? ["Launch day has zero website sessions in the analytics ledger."] : [],
  };
}

function productionPanel(
  launch: LaunchDashboardModel,
  monitoring: ProductionMonitoringSnapshot | null,
): ExecutivePanel {
  if (!monitoring) {
    const website = availabilityStatus(launch, "website");
    return {
      id: "production-health",
      title: "Production health",
      status: website === "unavailable" ? "RED" : "N/A",
      summary:
        "Row 61 production monitoring snapshot is not available in this environment. Missing telemetry is not treated as an outage.",
      metrics: [
        { label: "Website (launch availability)", value: website },
        { label: "Uptime probes", value: "N/A" },
        { label: "Database", value: "N/A" },
        { label: "Application errors (Row 61)", value: "N/A" },
      ],
      sourceLabel: "Row 61 snapshot missing · Row 151 availability as fallback",
      investigateHref: "/ops/admin/launch-dashboard",
      issues: [],
    };
  }
  const status = worstPanelStatus([
    monitoringStatus(monitoring.uptime.status),
    monitoringStatus(monitoring.errors.status),
    monitoringStatus(monitoring.database.status),
    availabilityStatus(launch, "website") === "unavailable" ? "RED" : "GREEN",
  ]);
  const issues = [
    ...(monitoring.uptime.status === "FAIL" ? ["Uptime probe FAIL."] : []),
    ...(monitoring.database.status === "FAIL" ? ["Database probe FAIL."] : []),
    ...(monitoring.errors.status === "FAIL" || monitoring.errors.openCritical > 0
      ? [`Open critical application errors: ${monitoring.errors.openCritical}.`]
      : []),
    ...monitoring.alerts
      .filter((alert) => alert.founderAttention)
      .map((alert) => `${alert.system}: ${alert.failureType}`),
  ];
  return {
    id: "production-health",
    title: "Production health",
    status,
    summary: `Uptime ${monitoring.uptime.status} · errors ${monitoring.errors.status} · database ${monitoring.database.status}. Last verification ${monitoring.uptime.lastVerification}.`,
    metrics: [
      {
        label: "Uptime",
        value: monitoring.uptime.status,
        hint: `alerting ${monitoring.uptime.alerting}`,
      },
      {
        label: "Application errors",
        value: monitoring.errors.status,
        hint: `${monitoring.errors.openCritical} open critical`,
      },
      {
        label: "Database",
        value: monitoring.database.status,
        hint: monitoring.database.connected ? "connected" : "not connected",
      },
      {
        label: "Canonical DNS",
        value: monitoring.canonicalDns,
      },
    ],
    sourceLabel: "Row 61 production monitoring snapshot (read-only)",
    investigateHref: "/ops/admin/launch-dashboard",
    issues,
  };
}

function paymentsPanel(
  launch: LaunchDashboardModel,
  monitoring: ProductionMonitoringSnapshot | null,
): ExecutivePanel {
  const paymentDown = availabilityStatus(launch, "payment") === "unavailable";
  const checkoutDown = availabilityStatus(launch, "checkout") === "unavailable";
  const monitorPay = monitoringStatus(monitoring?.payments.status);
  const failed = launch.revenue.failedPaymentsToday;
  const status = paymentDown || checkoutDown || monitorPay === "RED"
    ? "RED"
    : failed > 0 || monitorPay === "YELLOW"
      ? "YELLOW"
      : "GREEN";
  return {
    id: "payments",
    title: "Payments",
    status,
    summary: `${count(failed)} failed payment(s) today. Checkout ${availabilityStatus(launch, "checkout")} · payment ${availabilityStatus(launch, "payment")}. Stripe mode ${monitoring?.payments.mode ?? "N/A"}.`,
    metrics: [
      {
        label: "Failed payments today",
        value: count(failed),
        hint: `Cumulative ${count(launch.revenue.failedPaymentsCumulative)}`,
      },
      {
        label: "Net revenue today",
        value: money(launch.revenue.netTodayCents),
        hint: launch.revenue.refundsNote,
      },
      {
        label: "Stripe (Row 61)",
        value: monitoring ? monitoring.payments.status : "N/A",
        hint: monitoring
          ? `${monitoring.payments.mode} · webhook ${monitoring.payments.webhookConfigured ? "configured" : "missing"}`
          : "Monitoring snapshot not available",
      },
      {
        label: "Refunds today",
        value: money(launch.revenue.refundsTodayCents),
      },
    ],
    sourceLabel: "Billing / Stripe webhooks + Row 61 payments probe (read-only)",
    investigateHref: "/ops/admin/launch-dashboard",
    issues: [
      ...(paymentDown ? ["Payment surface marked unavailable."] : []),
      ...(checkoutDown ? ["Checkout surface marked unavailable."] : []),
      ...(monitorPay === "RED" ? ["Row 61 payments probe FAIL."] : []),
    ],
  };
}

function accountAccessPanel(launch: LaunchDashboardModel): ExecutivePanel {
  const authFailed = errorToday(launch, "auth_failed") ?? 0;
  const registrationFailed = errorToday(launch, "registration_failed") ?? 0;
  const loginDown =
    availabilityStatus(launch, "architect_access") === "unavailable" ||
    availabilityStatus(launch, "registration") === "unavailable";
  const criticalAuth = launch.errors.some(
    (row) =>
      row.productArea === "auth" &&
      row.opsSeverity === "CRITICAL" &&
      (row.open ?? row.today ?? 0) > 0,
  );
  const loginSupport =
    launch.support.byCategory.find((row) => row.category === "login")?.open ?? 0;
  const registrationSupport =
    launch.support.byCategory.find((row) => row.category === "registration")?.open ?? 0;
  const status = loginDown || criticalAuth
    ? "RED"
    : authFailed > 0 || registrationFailed > 0
      ? "YELLOW"
      : "GREEN";
  return {
    id: "account-access",
    title: "Account / access failures",
    status,
    summary: `${count(authFailed)} auth failure(s) and ${count(registrationFailed)} registration failure(s) today. Login ${availabilityStatus(launch, "architect_access")}.`,
    metrics: [
      { label: "auth_failed today", value: count(errorToday(launch, "auth_failed")) },
      {
        label: "registration_failed today",
        value: count(errorToday(launch, "registration_failed")),
      },
      {
        label: "Purchased → account active",
        value: `${count(launch.activation.accountActive)} / ${count(launch.activation.purchased)}`,
      },
      {
        label: "Open login / registration tickets",
        value: `${loginSupport} / ${registrationSupport}`,
      },
    ],
    sourceLabel: "Row 150 auth/registration events + Row 151 availability + Row 153 tickets",
    investigateHref: "/ops/admin/launch-dashboard",
    issues: [
      ...(loginDown ? ["Registration or Architect access marked unavailable."] : []),
      ...(criticalAuth ? ["Open CRITICAL application/server failure on auth."] : []),
    ],
  };
}

function luminaPanel(launch: LaunchDashboardModel): ExecutivePanel {
  const luminaErrors = errorToday(launch, "lumina_error");
  const luminaAvail = availabilityStatus(launch, "lumina");
  const luminaRisks = launch.risks.filter(
    (risk) => risk.category === "lumina" && risk.status !== "resolved",
  );
  const redRisk = luminaRisks.some((risk) => risk.severity === "RED");
  const yellowRisk = luminaRisks.some((risk) => risk.severity === "YELLOW");
  let status: PanelStatus = "N/A";
  if (luminaAvail === "unavailable" || redRisk) status = "RED";
  else if (luminaAvail === "degraded" || (luminaErrors ?? 0) > 0 || yellowRisk) status = "YELLOW";
  else if (luminaAvail === "available") status = "GREEN";
  else if ((luminaErrors ?? 0) === 0) status = "N/A";
  return {
    id: "lumina-health",
    title: "Lumina health",
    status,
    summary:
      luminaAvail === "unreported" && (luminaErrors ?? 0) === 0 && luminaRisks.length === 0
        ? "No safe automated Lumina probe. Unreported is not advertised as ping-monitored. Usage counts only; no conversation content."
        : `Lumina ${luminaAvail}. ${count(launch.activation.luminaOpenedToday)} opened today. ${count(luminaErrors)} error event(s) today.`,
    metrics: [
      { label: "Availability", value: luminaAvail },
      {
        label: "Opened today",
        value: count(launch.activation.luminaOpenedToday),
        hint: "lumina_opened · usage only",
      },
      { label: "lumina_error today", value: count(luminaErrors) },
      { label: "Open Lumina risks", value: count(luminaRisks.length) },
    ],
    sourceLabel: "Row 150 Lumina events + Row 151 availability. No conversation text.",
    investigateHref: "/ops/admin/launch-dashboard",
    issues: luminaRisks.map((risk) => risk.description),
  };
}

function supportPanel(launch: LaunchDashboardModel): ExecutivePanel {
  const slaPressure =
    launch.support.overdue > 0 ||
    launch.support.approachingSla > 0 ||
    launch.support.open >= 10 ||
    launch.support.p1Open > 0;
  return {
    id: "support-volume",
    title: "Support volume",
    status: slaPressure ? "YELLOW" : "GREEN",
    summary: `${count(launch.support.newToday)} new today · ${count(launch.support.open)} open · ${count(launch.support.overdue)} overdue. ${launch.support.slaStandard}`,
    metrics: [
      { label: "New today", value: count(launch.support.newToday) },
      { label: "Open", value: count(launch.support.open) },
      {
        label: "Overdue / approaching SLA",
        value: `${count(launch.support.overdue)} / ${count(launch.support.approachingSla)}`,
      },
      {
        label: "P1 open",
        value: count(launch.support.p1Open),
        hint: `Urgent escalations ${count(launch.support.urgentEscalations)}`,
      },
    ],
    sourceLabel: "Row 153 tickets (counts only · no message bodies)",
    investigateHref: "/ops/admin/support",
    issues: slaPressure
      ? ["Support backlog, SLA pressure, or P1 tickets require operator attention."]
      : [],
  };
}

function marketingPanel(
  launch: LaunchDashboardModel,
  marketing: LaunchKpiDashboardModel,
): ExecutivePanel {
  const today = marketing.days.find((day) => day.dateEt === launch.dateEt);
  const errorIssues = marketing.issues.filter((issue) => issue.severity === "error");
  const ig = marketing.channels.find((channel) => channel.channel === "instagram");
  const tt = marketing.channels.find((channel) => channel.channel === "tiktok");
  return {
    id: "marketing-performance",
    title: "Marketing performance",
    status: errorIssues.length > 0 ? "YELLOW" : "GREEN",
    summary: `Campaign landing sessions ${formatCount(marketing.funnel.landingPageSessions)} · purchases ${formatCount(marketing.funnel.purchases)} · conversion ${formatRate(marketing.funnel.rates.purchaseConversion)}. LinkedIn is not a launch reporting requirement.`,
    metrics: [
      {
        label: "Landing-page sessions",
        value: formatCount(marketing.funnel.landingPageSessions),
        hint: today ? `Today ${formatCount(today.totals.landingPageSessions)}` : "Campaign window",
      },
      {
        label: "Launch purchases (Row 84)",
        value: formatCount(marketing.funnel.purchases),
        hint: `Revenue ${formatUsdFromCents(marketing.funnel.revenueCents)}`,
      },
      {
        label: "Instagram landing sessions",
        value: formatCount(ig?.landingPageSessions ?? 0),
      },
      {
        label: "TikTok landing sessions",
        value: formatCount(tt?.landingPageSessions ?? 0),
      },
    ],
    sourceLabel: "Row 84 Launch Marketing KPI · Instagram and TikTok",
    investigateHref: "/ops/admin/launch-kpi",
    issues: errorIssues.map((issue) => issue.message),
  };
}

function incidentsPanel(
  launch: LaunchDashboardModel,
  monitoring: ProductionMonitoringSnapshot | null,
): ExecutivePanel {
  const open = launch.risks.filter((risk) => risk.status !== "resolved");
  const red = open.filter((risk) => risk.severity === "RED");
  const yellow = open.filter((risk) => risk.severity === "YELLOW");
  const firing = monitoring?.alerts.filter((alert) => alert.founderAttention) ?? [];
  const status: PanelStatus =
    red.length > 0 || launch.criticalIssuesOpen > 0 || firing.length > 0
      ? "RED"
      : yellow.length > 0
        ? "YELLOW"
        : "GREEN";
  return {
    id: "critical-incidents",
    title: "Critical incidents",
    status,
    summary: `${count(red.length)} open RED risk(s) · ${count(yellow.length)} YELLOW · ${count(launch.criticalIssuesOpen)} critical issue(s) in launch health.`,
    metrics: [
      { label: "Open RED risks", value: count(red.length) },
      { label: "Open YELLOW risks", value: count(yellow.length) },
      { label: "Critical issues open", value: count(launch.criticalIssuesOpen) },
      { label: "Monitoring founder alerts", value: count(firing.length) },
    ],
    sourceLabel: "Row 151 risk register + Row 61 alerts",
    investigateHref: "/ops/admin/launch-dashboard",
    issues: [
      ...red.map((risk) => `RED: ${risk.description}`),
      ...yellow.map((risk) => `YELLOW: ${risk.description}`),
      ...firing.map((alert) => `${alert.system}: ${alert.failureType}`),
    ],
  };
}

function founderPanel(
  launch: LaunchDashboardModel,
  decisions: ExecutiveDecisionCard[],
  aosBackend: "supabase_postgres" | "none",
  monitoring: ProductionMonitoringSnapshot | null,
): ExecutivePanel {
  const urgent = decisions.filter((decision) => decision.severity === "urgent");
  const monitoringFounder = Boolean(monitoring?.operations.founderAttention);
  const monitoringFail =
    monitoring?.uptime.status === "FAIL" ||
    monitoring?.errors.status === "FAIL" ||
    monitoring?.database.status === "FAIL" ||
    monitoring?.payments.status === "FAIL";
  let status: PanelStatus = "GREEN";
  if (urgent.length > 0 || launch.health === "RED") status = "RED";
  else if (
    decisions.length > 0 ||
    launch.founderAttentionRequired ||
    monitoringFounder ||
    monitoringFail
  ) {
    status = "YELLOW";
  } else if (aosBackend === "none" && !launch.founderAttentionRequired) {
    status = "N/A";
  }
  const summary =
    decisions.length === 0 && !launch.founderAttentionRequired && !monitoringFounder
      ? aosBackend === "none"
        ? "No launch-health Founder gate. AOS decision queue is not connected in this environment."
        : "No Founder action required."
      : `${count(decisions.length)} open AOS decision(s). Launch Founder attention ${launch.founderAttentionRequired ? "YES" : "NO"}.`;
  return {
    id: "founder-decisions",
    title: "Decisions requiring Founder attention",
    status,
    summary,
    metrics: [
      { label: "Open AOS decisions", value: count(decisions.length) },
      { label: "Urgent", value: count(urgent.length) },
      {
        label: "Launch Founder attention",
        value: launch.founderAttentionRequired ? "YES" : "NO",
      },
      { label: "AOS backend", value: aosBackend === "none" ? "not connected" : "Postgres" },
    ],
    sourceLabel: "AOS Founder Decision Queue + Row 151 Founder escalation",
    investigateHref: "/ops/admin/agent-operations",
    issues: [
      ...launch.founderReasons,
      ...decisions.map(
        (decision) =>
          `${decision.severity.toUpperCase()}: ${decision.decisionRequired}`,
      ),
    ],
  };
}

export function composeExecutiveDashboard(input: {
  launch: LaunchDashboardModel;
  marketing: LaunchKpiDashboardModel;
  monitoring: ProductionMonitoringSnapshot | null;
  founderDecisions: FounderDecision[];
  aosBackend: "supabase_postgres" | "none";
}): ExecutiveDashboardModel {
  const decisions: ExecutiveDecisionCard[] = input.founderDecisions
    .filter((decision) => decision.status === "OPEN")
    .map((decision) => ({
      decisionId: decision.decisionId,
      severity: decision.severity,
      requestingAgent: decision.requestingAgent,
      decisionRequired: decision.decisionRequired,
      riskIfDelayed: decision.riskIfDelayed,
      deadline: decision.deadline,
    }));
  const panels: ExecutivePanel[] = [
    enrollmentPanel(input.launch),
    trafficPanel(input.launch),
    productionPanel(input.launch, input.monitoring),
    paymentsPanel(input.launch, input.monitoring),
    accountAccessPanel(input.launch),
    luminaPanel(input.launch),
    supportPanel(input.launch),
    marketingPanel(input.launch, input.marketing),
    incidentsPanel(input.launch, input.monitoring),
    founderPanel(input.launch, decisions, input.aosBackend, input.monitoring),
  ];
  const ids = panels.map((panel) => panel.id);
  if (EXECUTIVE_PANEL_IDS.some((id) => !ids.includes(id))) {
    throw new Error("executive_dashboard_missing_required_panel");
  }
  const productionRed =
    panels.find((panel) => panel.id === "production-health")?.status === "RED";
  const paymentsRed = panels.find((panel) => panel.id === "payments")?.status === "RED";
  const accessRed =
    panels.find((panel) => panel.id === "account-access")?.status === "RED";
  const incidentsRed =
    panels.find((panel) => panel.id === "critical-incidents")?.status === "RED";
  const founderAttentionRequired =
    input.launch.founderAttentionRequired ||
    input.launch.health === "RED" ||
    decisions.length > 0 ||
    productionRed ||
    paymentsRed ||
    accessRed ||
    incidentsRed ||
    Boolean(input.monitoring?.operations.founderAttention) ||
    Boolean(input.monitoring?.alerts.some((alert) => alert.founderAttention));
  const founderAttentionReasons = [
    ...input.launch.founderReasons,
    ...decisions.map((decision) => `AOS: ${decision.decisionRequired}`),
    ...(productionRed ? ["Production health is RED."] : []),
    ...(paymentsRed ? ["Payments panel is RED."] : []),
    ...(accessRed ? ["Account / access panel is RED."] : []),
    ...(incidentsRed ? ["Critical incidents panel is RED."] : []),
    ...(input.monitoring?.operations.founderAttention
      ? ["Row 61 monitoring marked Founder attention."]
      : []),
    ...(input.monitoring?.alerts
      .filter((alert) => alert.founderAttention)
      .map((alert) => `Row 61 alert: ${alert.system} ${alert.failureType}`) ?? []),
  ];
  if (!founderAttentionRequired) {
    founderAttentionReasons.length = 0;
    founderAttentionReasons.push("No Founder action required.");
  }
  return {
    generatedAt: new Date().toISOString(),
    dateEt: input.launch.dateEt,
    launchLabel: input.launch.launchLabel,
    launchDayNumber: input.launch.launchDayNumber,
    launchHealth: input.launch.health,
    executiveStatus: worstPanelStatus(panels.map((panel) => panel.status)),
    founderAttentionRequired,
    founderAttentionReasons,
    criticalIssuesOpen: input.launch.criticalIssuesOpen,
    aosBackend: input.aosBackend,
    monitoringAvailable: Boolean(input.monitoring),
    dataFreshness: input.launch.dataFreshness.lastRefresh,
    panels,
    decisions,
    viewingFrozenSnapshot: input.launch.viewingFrozenSnapshot,
  };
}
