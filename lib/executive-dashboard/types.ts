import type { LaunchHealth } from "@/lib/launch-dashboard/types";

export const EXECUTIVE_PANEL_IDS = [
  "enrollment-revenue",
  "traffic-conversion",
  "production-health",
  "payments",
  "account-access",
  "lumina-health",
  "support-volume",
  "marketing-performance",
  "critical-incidents",
  "founder-decisions",
] as const;

export type ExecutivePanelId = (typeof EXECUTIVE_PANEL_IDS)[number];

export const PANEL_STATUSES = ["GREEN", "YELLOW", "RED", "N/A"] as const;
export type PanelStatus = (typeof PANEL_STATUSES)[number];

export const TELEMETRY_STATES = ["confirmed", "unconfirmed"] as const;
export type TelemetryState = (typeof TELEMETRY_STATES)[number];

export type ExecutiveMetric = {
  label: string;
  value: string;
  hint?: string;
};

export type ExecutiveDecisionCard = {
  decisionId: string;
  severity: "normal" | "urgent";
  requestingAgent: string;
  decisionRequired: string;
  riskIfDelayed: string;
  deadline: string | null;
};

export type ExecutivePanel = {
  id: ExecutivePanelId;
  title: string;
  status: PanelStatus;
  telemetry: TelemetryState;
  summary: string;
  metrics: ExecutiveMetric[];
  sourceLabel: string;
  investigateHref: string;
  issues: string[];
};

export type ExecutiveDashboardModel = {
  generatedAt: string;
  dateEt: string;
  launchLabel: string;
  launchDayNumber: string;
  launchHealth: LaunchHealth;
  executiveStatus: PanelStatus;
  founderAttentionRequired: boolean;
  founderAttentionReasons: string[];
  criticalIssuesOpen: number;
  aosBackend: "supabase_postgres" | "none";
  monitoringAvailable: boolean;
  dataFreshness: string;
  panels: ExecutivePanel[];
  decisions: ExecutiveDecisionCard[];
  viewingFrozenSnapshot: boolean;
};

export const EXECUTIVE_DASHBOARD_HREF = "/ops/admin/executive-dashboard";
export const EXECUTIVE_DASHBOARD_HREF_ES = "/es/ops/admin/executive-dashboard";
export const EXECUTIVE_REVIEW_HREF = "/_internal/row209-executive-dashboard-review";
