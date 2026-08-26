import { trackProductEvent } from "@/lib/analytics/track";
import { dateEt } from "@/lib/marketing-kpi/attribution";

export async function trackArchitectDownload(input: {
  userId: string;
  assetId: string;
  assetType: string;
  chapterId?: string;
  phase: "started" | "completed" | "failed";
  errorCategory?: string;
}): Promise<void> {
  const name =
    input.phase === "started"
      ? "download_started"
      : input.phase === "completed"
        ? "download_completed"
        : "download_failed";
  await trackProductEvent({
    name,
    userId: input.userId,
    productArea: input.assetId === "certificate" ? "completion" : "downloads",
    idempotencyKey: `${name}:${input.userId}:${input.assetId}:${dateEt()}`,
    payload: {
      assetId: input.assetId,
      assetType: input.assetType,
      chapterId: input.chapterId,
      errorCategory: input.errorCategory,
    },
  });

  if (input.assetId === "certificate" && input.phase === "completed") {
    await trackProductEvent({
      name: "certificate_generated",
      userId: input.userId,
      productArea: "completion",
      idempotencyKey: `certificate_generated:${input.userId}`,
      payload: { assetId: "certificate", assetType: "pdf" },
    });
    await trackProductEvent({
      name: "certificate_downloaded",
      userId: input.userId,
      productArea: "completion",
      idempotencyKey: `certificate_downloaded:${input.userId}:${dateEt()}`,
      payload: { assetId: "certificate", assetType: "pdf" },
    });
  }
}

export function architectDownloadTracker(userId: string, assetId: string) {
  const base = {
    userId,
    assetId,
    assetType: "pdf" as const,
  };
  return {
    started: () => trackArchitectDownload({ ...base, phase: "started" }),
    completed: () => trackArchitectDownload({ ...base, phase: "completed" }),
    failed: () =>
      trackArchitectDownload({
        ...base,
        phase: "failed",
        errorCategory: "generation_failed",
      }),
  };
}
