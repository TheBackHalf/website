import { redirect } from "next/navigation";
import { AppShellPage } from "@/components/app-shell/app-shell-page";
import { Chapter3Experience } from "@/components/journey/chapter-3/chapter-3-experience";
import {
  CHAPTER_3_SECTIONS,
  resolveChapter3DisplayName,
  type Chapter3SectionId,
} from "@/content/journey/chapter-3-decision";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { getLoginPath } from "@/lib/auth/routing";
import { loadChapter3ForUser } from "@/lib/journey/chapters/chapter-3-service";
import { getChapter3Path } from "@/lib/journey/chapters/paths";
import { redirectIfOnboardingIncomplete } from "@/lib/journey/onboarding/gate";
import { redirectIfChapterUnavailable } from "@/lib/journey/progress/page-gate";
import type { Locale } from "@/lib/i18n/config";

type Chapter3PageProps = {
  locale: Locale;
  sectionId: Chapter3SectionId;
};

export async function Chapter3Page({ locale, sectionId }: Chapter3PageProps) {
  const path = getChapter3Path(locale, sectionId);

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

  const loaded = await loadChapter3ForUser(actor.user.id);
  await redirectIfChapterUnavailable(loaded, {
    locale,
    userId: actor.user.id,
    requestedSection: sectionId,
    sectionOrder: CHAPTER_3_SECTIONS,
    chapterPath: (nextLocale, section) =>
      getChapter3Path(nextLocale, section as Chapter3SectionId),
  });
  if (loaded.status !== "ok") {
    redirect(getLocalizedArchitectPath("journey", locale));
  }

  // No AppShellPageHeader title — Chapter III hero owns the single title block:
  // THE DECISION / Chapter III — The Decision / tagline.
  return (
    <AppShellPage locale={locale} className="bh-chapter-1-page">
      <div className="bh-onboarding-panel pb-16">
        <Chapter3Experience
          locale={locale}
          firstName={resolveChapter3DisplayName(
            actor.user.firstName,
            actor.user.email,
          )}
          sectionId={sectionId}
          record={loaded.record}
        />
      </div>
    </AppShellPage>
  );
}
