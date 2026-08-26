import {
  SUPPORT_SLA_HOURS,
  type AvailabilityRecord,
  type ErrorRow,
  type LaunchDashboardModel,
  type LaunchHealth,
  type LaunchRiskRecord,
} from "@/lib/launch-dashboard/types";

const CRITICAL_AREAS = new Set([
  "website",
  "registration",
  "checkout",
  "payment",
]);

export function evaluateLaunchHealth(input: {
  risks: LaunchRiskRecord[];
  availability: AvailabilityRecord[];
  errors: ErrorRow[];
  supportOpen: number;
  approachingSla: number;
  dateEt: string;
  checkoutStartsToday: number;
  purchasesToday: number;
  checkoutFailedToday: number;
  qualityIssues: string[];
  errorLedgerAvailable?: boolean;
}): {
  health: LaunchHealth;
  founderAttentionRequired: boolean;
  criticalIssuesOpen: number;
  healthReasons: string[];
  founderReasons: string[];
} {
  const openRisks = input.risks.filter((risk) => risk.status !== "resolved");
  const redRisks = openRisks.filter((risk) => risk.severity === "RED");
  const yellowRisks = openRisks.filter((risk) => risk.severity === "YELLOW");
  const founderRisks = openRisks.filter((risk) => risk.founderEscalationRequired);
  const sensitiveOpen = openRisks.filter((risk) =>
    ["security", "privacy", "legal"].includes(risk.category),
  );
  const down = input.availability.filter(
    (row) =>
      row.status === "unavailable" && CRITICAL_AREAS.has(row.area),
  );
  const criticalSurfaceOps = input.errors.filter(
    (row) =>
      row.kind === "application_server" &&
      row.opsSeverity === "CRITICAL" &&
      (row.open ?? row.today ?? 0) > 0 &&
      (CRITICAL_AREAS.has(row.productArea) || row.productArea === "auth"),
  );
  const criticalErrors = input.errors.filter(
    (row) =>
      ((row.today ?? 0) >= 5 || (row.opsSeverity === "HIGH" && (row.open ?? 0) >= 3)) &&
      ["registration", "checkout", "payment", "journey", "lumina", "auth"].includes(
        row.productArea,
      ),
  );

  const healthReasons: string[] = [];
  const founderReasons: string[] = [];

  if (redRisks.length) {
    healthReasons.push(`${redRisks.length} open RED launch risk(s).`);
  }
  if (down.length) {
    healthReasons.push(
      `Critical surface unavailable: ${down.map((row) => row.area).join(", ")}.`,
    );
  }
  if (sensitiveOpen.some((risk) => risk.severity === "RED")) {
    healthReasons.push("Open RED security/privacy/legal risk.");
  }
  if (criticalSurfaceOps.length) {
    healthReasons.push(
      `Open CRITICAL application/server failure on ${criticalSurfaceOps
        .map((row) => row.productArea)
        .join(", ")}.`,
    );
  }

  let health: LaunchHealth = "GREEN";
  if (healthReasons.length) {
    health = "RED";
  } else {
    if (yellowRisks.length) {
      healthReasons.push(`${yellowRisks.length} open YELLOW launch risk(s).`);
      health = "YELLOW";
    }
    if (criticalErrors.length) {
      healthReasons.push(
        `Elevated error volume today: ${criticalErrors.map((row) => row.category).join(", ")}.`,
      );
      health = "YELLOW";
    }
    if (input.approachingSla > 0) {
      healthReasons.push(
        `${input.approachingSla} support request(s) approaching or beyond the published ${SUPPORT_SLA_HOURS}h response expectation.`,
      );
      health = "YELLOW";
    }
    if (input.supportOpen >= 10) {
      healthReasons.push(`Support backlog ${input.supportOpen} unresolved.`);
      health = "YELLOW";
    }
    if (
      input.dateEt >= "2026-08-31" &&
      input.checkoutStartsToday > 0 &&
      input.purchasesToday === 0 &&
      input.checkoutFailedToday > 0
    ) {
      healthReasons.push(
        "Launch-day checkout starts with payment failures and zero purchases.",
      );
      health = "YELLOW";
    }
    if (input.qualityIssues.some((issue) => issue.startsWith("ERROR:"))) {
      healthReasons.push("Data-quality error on launch figures.");
      health = "YELLOW";
    }
    if (input.errorLedgerAvailable === false) {
      healthReasons.push(
        "Application/server error ledger is not available; launch health cannot be confirmed GREEN.",
      );
      health = "YELLOW";
    }
  }

  if (!healthReasons.length) {
    healthReasons.push("No material launch threat under documented rules.");
  }

  if (health === "RED") {
    founderReasons.push("Launch Health is RED.");
  }
  for (const risk of founderRisks) {
    founderReasons.push(`Risk ${risk.id} requires Founder escalation (${risk.category}).`);
  }
  for (const risk of sensitiveOpen) {
    if (!founderReasons.some((line) => line.includes(risk.id))) {
      founderReasons.push(
        `Open ${risk.category} risk ${risk.id} requires Founder attention.`,
      );
    }
  }
  for (const row of down) {
    founderReasons.push(`Critical availability: ${row.area} is unavailable.`);
  }
  for (const row of criticalSurfaceOps) {
    founderReasons.push(
      `CRITICAL application/server failure: ${row.productArea} / ${row.category}.`,
    );
  }

  return {
    health,
    founderAttentionRequired: founderReasons.length > 0,
    criticalIssuesOpen: redRisks.length + down.length + criticalSurfaceOps.length,
    healthReasons,
    founderReasons,
  };
}

export function emptyAvailability(): AvailabilityRecord[] {
  return [
    "website",
    "registration",
    "checkout",
    "payment",
    "architect_access",
    "journey",
    "lumina",
  ].map((area) => ({
    area: area as AvailabilityRecord["area"],
    status: "unreported" as const,
    note: "Assumed available — no outage reported. MANUAL unless an automated config probe is shown. Not synthetic uptime monitoring.",
    updatedAt: "",
    updatedBy: "system",
    source: "manual",
  }));
}

export function applyHealth(
  model: Omit<
    LaunchDashboardModel,
    | "health"
    | "founderAttentionRequired"
    | "criticalIssuesOpen"
    | "healthReasons"
    | "founderReasons"
    | "briefMarkdown"
  > & {
    health?: LaunchHealth;
    founderAttentionRequired?: boolean;
    criticalIssuesOpen?: number;
    healthReasons?: string[];
    founderReasons?: string[];
    briefMarkdown?: string;
  },
): Omit<LaunchDashboardModel, "briefMarkdown"> {
  const evaluated = evaluateLaunchHealth({
    risks: model.risks,
    availability: model.availability,
    errors: model.errors,
    supportOpen: model.support.unresolved,
    approachingSla: model.support.approachingSla,
    dateEt: model.dateEt,
    checkoutStartsToday: model.conversion.checkoutStarted,
    purchasesToday: model.revenue.purchasesToday,
    checkoutFailedToday:
      model.errors.find((row) => row.category === "checkout_failed")?.today ?? 0,
    qualityIssues: model.qualityIssues,
    errorLedgerAvailable: !model.qualityIssues.some((issue) =>
      issue.includes("error ledger unavailable"),
    ),
  });
  return {
    ...model,
    ...evaluated,
  };
}
