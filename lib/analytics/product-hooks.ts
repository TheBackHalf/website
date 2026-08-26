import { trackProductEvent } from "@/lib/analytics/track";
import { dateEt } from "@/lib/marketing-kpi/attribution";
import type { OnboardingRecord } from "@/lib/journey/onboarding/types";
import type { JourneyProgressRecord } from "@/lib/journey/progress/types";

export async function emitOnboardingAnalytics(
  previous: OnboardingRecord | undefined,
  next: OnboardingRecord,
): Promise<void> {
  const locale = undefined;
  if (!previous || previous.completedSteps.length === 0) {
    await trackProductEvent({
      name: "onboarding_started",
      userId: next.userId,
      locale,
      productArea: "onboarding",
      idempotencyKey: `onboarding_started:${next.userId}`,
      payload: { step: "welcome", sequence: 1 },
    });
  }

  const step = next.currentStep === "completed" ? "completed" : next.currentStep;
  await trackProductEvent({
    name: "onboarding_step_viewed",
    userId: next.userId,
    productArea: "onboarding",
    idempotencyKey: `onboarding_step_viewed:${next.userId}:${step}:${dateEt()}`,
    payload: { step, sequence: next.completedSteps.length + 1 },
  });

  const prevCompleted = new Set(previous?.completedSteps ?? []);
  for (const completed of next.completedSteps) {
    if (!prevCompleted.has(completed)) {
      await trackProductEvent({
        name: "onboarding_step_completed",
        userId: next.userId,
        productArea: "onboarding",
        idempotencyKey: `onboarding_step_completed:${next.userId}:${completed}`,
        payload: { step: completed, sequence: next.completedSteps.indexOf(completed) + 1 },
      });
    }
  }

  if (next.status === "completed" && previous?.status !== "completed") {
    await trackProductEvent({
      name: "onboarding_completed",
      userId: next.userId,
      productArea: "onboarding",
      idempotencyKey: `onboarding_completed:${next.userId}`,
      payload: { step: "completed", sequence: next.completedSteps.length },
    });
  }
}

export async function emitJourneyProgressAnalytics(
  previous: JourneyProgressRecord | undefined,
  next: JourneyProgressRecord,
): Promise<void> {
  if (!previous) {
    await trackProductEvent({
      name: "journey_entered",
      userId: next.userId,
      productArea: "journey",
      idempotencyKey: `journey_entered:${next.userId}`,
      payload: { chapterId: next.chapterId, status: next.status },
    });
  }

  const chapterChanged = previous?.chapterId !== next.chapterId;
  const started =
    next.status === "in_progress" &&
    (!previous || previous.status === "not_started" || chapterChanged);

  if (started) {
    await trackProductEvent({
      name: "journey_chapter_started",
      userId: next.userId,
      productArea: "journey",
      idempotencyKey: `journey_chapter_started:${next.userId}:${next.chapterId}`,
      payload: { chapterId: next.chapterId, status: next.status },
    });
  }

  if (
    previous &&
    !chapterChanged &&
    previous.status === "in_progress" &&
    next.status === "in_progress"
  ) {
    const gap = Date.parse(next.updatedAt) - Date.parse(previous.updatedAt);
    if (Number.isFinite(gap) && gap > 6 * 60 * 60 * 1000) {
      await trackProductEvent({
        name: "journey_resumed",
        userId: next.userId,
        productArea: "journey",
        idempotencyKey: `journey_resumed:${next.userId}:${next.chapterId}:${dateEt()}`,
        payload: { chapterId: next.chapterId, status: next.status },
      });
    }
  }

  await trackProductEvent({
    name: "journey_progress_saved",
    userId: next.userId,
    productArea: "journey",
    idempotencyKey: `journey_progress_saved:${next.userId}:${next.chapterId}:${next.status}:${next.updatedAt}`,
    payload: { chapterId: next.chapterId, status: next.status },
  });

  if (
    next.status === "stage_completed" ||
    next.status === "chapter_completed"
  ) {
    await trackProductEvent({
      name: "journey_chapter_completed",
      userId: next.userId,
      productArea: "journey",
      idempotencyKey: `journey_chapter_completed:${next.userId}:${next.chapterId}`,
      payload: { chapterId: next.chapterId, status: next.status },
    });
  }

  if (next.status === "journey_completed") {
    await trackProductEvent({
      name: "journey_chapter_completed",
      userId: next.userId,
      productArea: "journey",
      idempotencyKey: `journey_chapter_completed:${next.userId}:${next.chapterId}`,
      payload: { chapterId: next.chapterId, status: next.status },
    });
    await trackProductEvent({
      name: "journey_completed",
      userId: next.userId,
      productArea: "completion",
      idempotencyKey: `journey_completed:${next.userId}`,
      payload: { chapterId: next.chapterId, status: next.status },
    });
    await trackProductEvent({
      name: "completion_experience_viewed",
      userId: next.userId,
      productArea: "completion",
      idempotencyKey: `completion_experience_viewed:${next.userId}`,
      payload: { chapterId: next.chapterId },
    });
  }
}
