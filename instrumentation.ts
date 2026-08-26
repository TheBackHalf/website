import {
  productAreaFromRoute,
  severityForFailure,
} from "@/lib/launch-ops-errors/types";

export async function onRequestError(
  error: { digest?: string; name?: string },
  request: { path?: string },
  context: { routePath?: string },
) {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { recordLaunchOpsError } = await import("@/lib/launch-ops-errors/record");
  const route = context.routePath || request.path || "";
  const productArea = productAreaFromRoute(route);
  await recordLaunchOpsError({
    productArea,
    errorCategory: error.name || "unhandled_server_error",
    route,
    service: "next",
    safeCode: error.digest,
    statusCode: 500,
    severity: severityForFailure({ productArea, route, statusCode: 500 }),
  });
}
