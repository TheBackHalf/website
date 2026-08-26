import type { OnboardingRecord } from "@/lib/journey/onboarding/types";
import type { JourneyProgressRecord } from "@/lib/journey/progress/types";
import { dispatchLifecycleAutomation } from "@/lib/lifecycle/dispatch";

function completedChapter(status: string): boolean {
  return status === "chapter_completed" || status === "stage_completed";
}

export async function emitLifecycleFromOnboarding(
  previous: OnboardingRecord | undefined,
  next: OnboardingRecord,
): Promise<void> {
  if (next.status === "completed" && previous?.status !== "completed") {
    await dispatchLifecycleAutomation({
      automationId: "progress.onboarding_completed",
      userId: next.userId,
      idempotencyKey: `lifecycle:progress.onboarding_completed:${next.userId}`,
      payload: { status: next.status, source: "onboarding" },
    });
  }
}

export async function emitLifecycleFromJourneyProgress(
  previous: JourneyProgressRecord | undefined,
  next: JourneyProgressRecord,
): Promise<void> {
  if (next.status === "journey_completed") {
    if (previous?.status !== "journey_completed") {
      await dispatchLifecycleAutomation({
        automationId: "completion.journey_completed",
        userId: next.userId,
        idempotencyKey: `lifecycle:completion.journey_completed:${next.userId}`,
        payload: { chapterId: next.chapterId, status: next.status, source: "journey" },
      });
    }
    return;
  }

  if (completedChapter(next.status) && previous?.status !== next.status) {
    await dispatchLifecycleAutomation({
      automationId: "progress.chapter_completed",
      userId: next.userId,
      idempotencyKey: `lifecycle:progress.chapter_completed:${next.userId}:${next.chapterId}`,
      payload: { chapterId: next.chapterId, status: next.status, source: "journey" },
    });
  }
}
