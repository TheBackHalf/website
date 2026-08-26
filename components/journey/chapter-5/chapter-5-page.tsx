import { redirect } from "next/navigation";
import { AppShellPage } from "@/components/app-shell/app-shell-page";
import { Chapter5Experience } from "@/components/journey/chapter-5/chapter-5-experience";
import {
  CHAPTER_5_SECTIONS,
  type Chapter5SectionId,
} from "@/content/journey/chapter-5-architect";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { getLoginPath } from "@/lib/auth/routing";
import { loadChapter5ForUser } from "@/lib/journey/chapters/chapter-5-service";
import { getChapter5Path } from "@/lib/journey/chapters/paths";
import { redirectIfOnboardingIncomplete } from "@/lib/journey/onboarding/gate";
import { redirectIfChapterUnavailable } from "@/lib/journey/progress/page-gate";
import type { Locale } from "@/lib/i18n/config";

type Chapter5PageProps = {
  locale: Locale;
  sectionId: Chapter5SectionId;
};

export async function Chapter5Page({ locale, sectionId }: Chapter5PageProps) {
  const path = getChapter5Path(locale, sectionId);

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

  const loaded = await loadChapter5ForUser(actor.user.id);
  await redirectIfChapterUnavailable(loaded, {
    locale,
    userId: actor.user.id,
    requestedSection: sectionId,
    sectionOrder: CHAPTER_5_SECTIONS,
    chapterPath: (nextLocale, section) =>
      getChapter5Path(nextLocale, section as Chapter5SectionId),
  });
  if (loaded.status !== "ok") {
    redirect(getLocalizedArchitectPath("journey", locale));
  }

  return (
    <AppShellPage locale={locale} className="bh-chapter-1-page">
      <div className="bh-onboarding-panel pb-16">
        <Chapter5Experience
          locale={locale}
          sectionId={sectionId}
          record={loaded.record}
        />
      </div>
    </AppShellPage>
  );
}
