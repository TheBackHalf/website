import type { AvailabilityArea, AvailabilityStatus } from "@/lib/launch-dashboard/types";
import type { OpsErrorSeverity } from "@/lib/launch-ops-errors/types";

export type MonitoringCheckStatus = "PASS" | "FAIL" | "DEGRADED";

export type UptimeTargetResult = {
  id: string;
  url: string;
  status: number;
  classified: "healthy" | "failed" | "missing" | "unreachable";
  ok: boolean;
  ms: number;
  error?: string;
};

export type MonitoringAlert = {
  environment: "Production";
  system: string;
  at: string;
  failureType: string;
  severity: OpsErrorSeverity;
  route?: string;
  investigate: string;
  technicalOwner: string;
  operationalCoordination: string;
  founderAttention: boolean;
};

export type ProductionMonitoringSnapshot = {
  generatedAt: string;
  environment: "Production";
  canonicalOrigin: string;
  applicationOrigin: string;
  canonicalDns: "resolves" | "not_found";
  uptime: {
    status: MonitoringCheckStatus;
    lastVerification: string;
    alerting: "armed" | "firing" | "none";
    targets: UptimeTargetResult[];
    missingPathDetection: UptimeTargetResult | null;
    recovery: UptimeTargetResult | null;
  };
  errors: {
    status: MonitoringCheckStatus;
    source: string;
    controlledTest: "verified_and_removed" | "verified" | "not_run" | "failed";
    alerting: "armed" | "firing" | "none";
    openCritical: number;
    openCriticalCategories: string[];
  };
  database: {
    status: MonitoringCheckStatus;
    connected: boolean;
    persistenceVerified: boolean;
    alerting: "armed" | "firing" | "none";
    backend: string;
  };
  payments: {
    status: MonitoringCheckStatus;
    provider: "Stripe";
    configured: boolean;
    mode: "test_sandbox" | "live" | "missing";
    webhookConfigured: boolean;
    providerReachable: boolean;
    alerting: "armed" | "firing" | "none";
  };
  operations: {
    technicalOwner: string;
    operationalCoordination: string;
    founderAttention: boolean;
  };
  alerts: MonitoringAlert[];
  availability: Array<{
    area: AvailabilityArea;
    status: AvailabilityStatus;
    note: string;
  }>;
};
