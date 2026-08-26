import { redirect } from "next/navigation";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import { getLocalizedPath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";
import type { ChapterProgressStatus } from "@/lib/journey/chapters/types";
import { decideSectionAccess } from "@/lib/journey/progress/rules";
import type { JourneyChapterId } from "@/lib/journey/progress/rules";
import { resolveLockedChapterRedirect } from "@/lib/journey/progress/paths";

type ChapterPageLoad =
  | {
      status: "ok";
      record: {
        status: ChapterProgressStatus;
        completedSectionIds: readonly string[];
      };
      resumeSectionId: string;
    }
  | { status: "blocked"; reason: string }
  | { status: "locked"; requiredChapterId: JourneyChapterId };

export async function redirectIfChapterUnavailable(
  loaded: ChapterPageLoad,
  input: {
    locale: Locale;
    userId: string;
    requestedSection: string;
    sectionOrder: readonly string[];
    chapterPath: (locale: Locale, section: string) => string;
  },
): Promise<void> {
  if (loaded.status === "blocked") {
    if (loaded.reason === "community_only") {
      redirect(getLocalizedArchitectPath("dashboard", input.locale));
    }
    redirect(
      `${getLocalizedPath("/checkout", input.locale)}?need=journey_access`,
    );
  }

  if (loaded.status === "locked") {
    redirect(
      await resolveLockedChapterRedirect(
        input.locale,
        loaded.requiredChapterId,
        input.userId,
      ),
    );
  }

  if (loaded.status !== "ok") {
    redirect(getLocalizedArchitectPath("journey", input.locale));
  }

  const sectionAccess = decideSectionAccess(
    input.requestedSection,
    input.sectionOrder,
    loaded.record.completedSectionIds,
    loaded.record.status,
  );
  if (sectionAccess === "locked") {
    redirect(input.chapterPath(input.locale, loaded.resumeSectionId));
  }
}
