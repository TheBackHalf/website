export const OPS_ERROR_SEVERITY = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export type OpsErrorSeverity = (typeof OPS_ERROR_SEVERITY)[number];

export const OPS_ERROR_STATUS = ["open", "resolved"] as const;
export type OpsErrorStatus = (typeof OPS_ERROR_STATUS)[number];

export type LaunchOpsErrorRecord = {
  id: string;
  fingerprint: string;
  firstSeen: string;
  lastSeen: string;
  occurrenceCount: number;
  productArea: string;
  errorCategory: string;
  severity: OpsErrorSeverity;
  route?: string;
  service?: string;
  safeCode?: string;
  status: OpsErrorStatus;
  test?: boolean;
};

const BLOCKED =
  /(password|token|secret|authorization|cookie|card|cvv|cvc|prompt|answer|email)/i;

export function sanitizeOpsErrorInput(input: {
  productArea?: string;
  errorCategory?: string;
  route?: string;
  service?: string;
  safeCode?: string;
  message?: string;
}): {
  productArea: string;
  errorCategory: string;
  route?: string;
  service?: string;
  safeCode?: string;
} {
  const clip = (value: string | undefined, max = 120) => {
    if (!value) return undefined;
    const trimmed = value.trim().slice(0, max);
    if (BLOCKED.test(trimmed)) return undefined;
    return trimmed.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@");
  };
  const area = clip(input.productArea, 40) || "website";
  const category =
    clip(input.errorCategory, 80) ||
    clip(input.message, 80) ||
    "unhandled_server_error";
  return {
    productArea: area.replace(/[^a-z0-9_/-]/gi, "_").slice(0, 40),
    errorCategory: category.replace(/\s+/g, "_").slice(0, 80),
    route: clip(input.route, 180),
    service: clip(input.service, 40),
    safeCode: clip(input.safeCode, 80),
  };
}

export function fingerprintOpsError(input: {
  productArea: string;
  errorCategory: string;
  route?: string;
  safeCode?: string;
}): string {
  return [input.productArea, input.errorCategory, input.route ?? "", input.safeCode ?? ""]
    .join("|")
    .slice(0, 180);
}

export function severityForFailure(input: {
  productArea: string;
  route?: string;
  statusCode?: number;
}): OpsErrorSeverity {
  const route = (input.route ?? "").toLowerCase();
  const area = input.productArea;
  const criticalSurface =
    area === "registration" ||
    area === "checkout" ||
    area === "payment" ||
    area === "auth" ||
    /\/api\/(auth|stripe|checkout)/.test(route) ||
    route.includes("/register") ||
    route.includes("/login");
  if (criticalSurface) return "CRITICAL";
  if ((input.statusCode ?? 500) >= 500) return "HIGH";
  return "MEDIUM";
}

export function productAreaFromRoute(route: string): string {
  const path = route.split("?")[0] ?? route;
  if (path.includes("/register") || path.includes("/api/auth")) return "registration";
  if (path.includes("/login")) return "auth";
  if (path.includes("/checkout") || path.includes("/api/stripe")) return "checkout";
  if (path.includes("/lumina")) return "lumina";
  if (path.includes("/journey") || path.includes("/onboarding")) return "journey";
  return "website";
}
