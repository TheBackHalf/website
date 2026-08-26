import { redirect } from "next/navigation";
import { AppShellPage } from "@/components/app-shell/app-shell-page";
import { Chapter6Experience } from "@/components/journey/chapter-6/chapter-6-experience";
import { type Chapter6SectionId } from "@/content/journey/chapter-6-expansion";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { getLoginPath } from "@/lib/auth/routing";
import { getLocalizedPath } from "@/lib/i18n/routing";
import { loadChapter6ForUser } from "@/lib/journey/chapters/chapter-6-service";
import { getChapter6Path } from "@/lib/journey/chapters/paths";
import { redirectIfOnboardingIncomplete } from "@/lib/journey/onboarding/gate";
import type { Locale } from "@/lib/i18n/config";

type Chapter6PageProps = {
  locale: Locale;
  sectionId: Chapter6SectionId;
};

export async function Chapter6Page({ locale, sectionId }: Chapter6PageProps) {
  const path = getChapter6Path(locale, sectionId);

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

  const loaded = await loadChapter6ForUser(actor.user.id);
  if (loaded.status === "blocked") {
    if (loaded.reason === "community_only") {
      redirect(getLocalizedArchitectPath("dashboard", locale));
    }
    redirect(`${getLocalizedPath("/checkout", locale)}?need=journey_access`);
  }

  return (
    <AppShellPage locale={locale} className="bh-chapter-1-page">
      <div className="bh-onboarding-panel pb-16">
        <Chapter6Experience
          locale={locale}
          sectionId={sectionId}
          record={loaded.record}
        />
      </div>
    </AppShellPage>
  );
}
