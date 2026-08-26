/**
 * Row 133 — Entitlement + sequential chapter gate.
 */

import type { JourneyChapterId } from "@/lib/journey/progress/rules";
import { resolveChapterAccessForUser } from "@/lib/journey/progress/snapshot";
import {
  loadOnboardingForEntitledUser,
  type OnboardingAccessError,
} from "@/lib/journey/onboarding/service";

export type ChapterGateResult =
  | { status: "ok" }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId };

export async function gateChapterLoad(
  userId: string,
  chapterId: JourneyChapterId,
): Promise<ChapterGateResult> {
  const entitled = await loadOnboardingForEntitledUser(userId);
  if (entitled.status !== "ok") {
    return entitled;
  }

  const access = await resolveChapterAccessForUser(userId, chapterId);
  if (access.access === "locked") {
    return {
      status: "locked",
      requiredChapterId: access.requiredChapterId,
    };
  }

  return { status: "ok" };
}
