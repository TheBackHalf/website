import { redirect } from "next/navigation";
import {
  AppShellPage,
  AppShellPageHeader,
} from "@/components/app-shell/app-shell-page";
import { Chapter1Experience } from "@/components/journey/chapter-1/chapter-1-experience";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import {
  CHAPTER_1_SECTIONS,
  type Chapter1SectionId,
} from "@/content/journey/chapter-1-awakening";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { getLoginPath } from "@/lib/auth/routing";
import { loadChapter1ForUser } from "@/lib/journey/chapters/service";
import { getChapter1Path } from "@/lib/journey/chapters/paths";
import { redirectIfOnboardingIncomplete } from "@/lib/journey/onboarding/gate";
import { redirectIfChapterUnavailable } from "@/lib/journey/progress/page-gate";
import type { Locale } from "@/lib/i18n/config";

type Chapter1PageProps = {
  locale: Locale;
  sectionId: Chapter1SectionId;
};

export async function Chapter1Page({ locale, sectionId }: Chapter1PageProps) {
  const path = getChapter1Path(locale, sectionId);
  const copy = getDictionary(locale).appShell.chapter1;

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

  const loaded = await loadChapter1ForUser(actor.user.id);
  await redirectIfChapterUnavailable(loaded, {
    locale,
    userId: actor.user.id,
    requestedSection: sectionId,
    sectionOrder: CHAPTER_1_SECTIONS,
    chapterPath: (nextLocale, section) =>
      getChapter1Path(nextLocale, section as Chapter1SectionId),
  });
  if (loaded.status !== "ok") {
    redirect(getLocalizedArchitectPath("journey", locale));
  }

  return (
    <AppShellPage locale={locale} className="bh-chapter-1-page">
      <AppShellPageHeader
        title={resolveAppShellLabel(locale, copy.title)}
        description={resolveAppShellLabel(locale, copy.description)}
      />
      <div className="bh-onboarding-panel pb-16">
        <Chapter1Experience
          locale={locale}
          firstName={actor.user.firstName}
          sectionId={sectionId}
          record={loaded.record}
        />
      </div>
    </AppShellPage>
  );
}
