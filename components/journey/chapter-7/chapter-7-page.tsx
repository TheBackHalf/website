import { redirect } from "next/navigation";
import { AppShellPage } from "@/components/app-shell/app-shell-page";
import { Chapter7Experience } from "@/components/journey/chapter-7/chapter-7-experience";
import {
  CHAPTER_7_SECTIONS,
  type Chapter7SectionId,
} from "@/content/journey/chapter-7-beginning";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { getLoginPath } from "@/lib/auth/routing";
import { loadChapter7ForUser } from "@/lib/journey/chapters/chapter-7-service";
import { getChapter7Path } from "@/lib/journey/chapters/paths";
import { redirectIfOnboardingIncomplete } from "@/lib/journey/onboarding/gate";
import { redirectIfChapterUnavailable } from "@/lib/journey/progress/page-gate";
import type { Locale } from "@/lib/i18n/config";

type Chapter7PageProps = {
  locale: Locale;
  sectionId: Chapter7SectionId;
};

export async function Chapter7Page({ locale, sectionId }: Chapter7PageProps) {
  const path = getChapter7Path(locale, sectionId);

  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      redirect(`${getLoginPath(locale)}?next=${encodeURIComponent(path)}`);
    }
    throw error;
  }

  await redirectIfOnboardingIncomplete(actor.user.id, locale);

  const loaded = await loadChapter7ForUser(actor.user.id);
  await redirectIfChapterUnavailable(loaded, {
    locale,
    userId: actor.user.id,
    requestedSection: sectionId,
    sectionOrder: CHAPTER_7_SECTIONS,
    chapterPath: (nextLocale, section) =>
      getChapter7Path(nextLocale, section as Chapter7SectionId),
  });
  if (loaded.status !== "ok") {
    redirect(getLocalizedArchitectPath("journey", locale));
  }

  return (
    <AppShellPage locale={locale} className="bh-chapter-1-page">
      <div className="bh-onboarding-panel pb-16">
        <Chapter7Experience
          locale={locale}
          sectionId={sectionId}
          record={loaded.record}
        />
      </div>
    </AppShellPage>
  );
}
