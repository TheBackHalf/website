import type { LaunchOpsErrorRecord } from "@/lib/launch-ops-errors/types";
import { severityForFailure } from "@/lib/launch-ops-errors/types";

export async function recordLaunchOpsError(input: {
  productArea?: string;
  errorCategory?: string;
  route?: string;
  service?: string;
  safeCode?: string;
  message?: string;
  statusCode?: number;
  test?: boolean;
  severity?: LaunchOpsErrorRecord["severity"];
}): Promise<LaunchOpsErrorRecord | undefined> {
  if (process.env.NEXT_RUNTIME === "edge") return undefined;
  const severity =
    input.severity ??
    severityForFailure({
      productArea: input.productArea ?? "website",
      route: input.route,
      statusCode: input.statusCode,
    });
  try {
    const { getLaunchDashboardStore } = await import("@/lib/launch-dashboard/store");
    return await getLaunchDashboardStore().upsertOpsError({
      ...input,
      severity,
    });
  } catch {
    return undefined;
  }
}

export async function listLaunchOpsErrors(options?: {
  includeTest?: boolean;
}): Promise<LaunchOpsErrorRecord[]> {
  if (process.env.NEXT_RUNTIME === "edge") return [];
  try {
    const { getLaunchDashboardStore } = await import("@/lib/launch-dashboard/store");
    return await getLaunchDashboardStore().listOpsErrors(options);
  } catch {
    return [];
  }
}

export function resetLaunchOpsErrorsForTests(): void {
  // Errors live in the launch dashboard store; reset that singleton in tests.
}
