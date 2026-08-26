export const ROW62_OWNERS = {
  technical: "Imani Heartbeat — Chief Technology & Risk Officer",
  operations: "Michelle Northstar — Chief of Staff & Operations Officer",
} as const;

export const CRITICAL_PUBLIC_TABLES = [
  "analytics_events",
  "marketing_kpi_events",
  "marketing_kpi_purchases",
  "marketing_kpi_social_daily",
  "marketing_kpi_meta",
  "launch_dashboard_risks",
  "launch_dashboard_availability",
  "launch_dashboard_snapshots",
  "launch_dashboard_support",
  "launch_dashboard_meta",
  "launch_ops_errors",
  "support_tickets",
  "bh_auth_users",
  "bh_auth_consents",
  "bh_durable_documents",
  "bh_lumina_conversations",
  "bh_lumina_memories",
  "bh_billing_stripe_events",
  "bh_billing_entitlements",
  "bh_billing_purchases",
] as const;

export const RECOVERY_DIR = ".tmp-row62-recovery";
export const DUMP_FILE = `${RECOVERY_DIR}/public-schema.dump.json`;
export const EVIDENCE_FILE =
  "ops/fab-5/runs/row-62-backup-restore-validation.json";
export const META_KEY = "row62_backup";

export const SAFE_TABLE = /^[a-z0-9_]+$/;
