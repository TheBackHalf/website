import { redirect } from "next/navigation";
import { AppShellPage } from "@/components/app-shell/app-shell-page";
import { Chapter5Experience } from "@/components/journey/chapter-5/chapter-5-experience";
import { type Chapter5SectionId } from "@/content/journey/chapter-5-architect";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { getLoginPath } from "@/lib/auth/routing";
import { getLocalizedPath } from "@/lib/i18n/routing";
import { loadChapter5ForUser } from "@/lib/journey/chapters/chapter-5-service";
import { getChapter5Path } from "@/lib/journey/chapters/paths";
import { redirectIfOnboardingIncomplete } from "@/lib/journey/onboarding/gate";
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
  if (loaded.status === "blocked") {
    if (loaded.reason === "community_only") {
      redirect(getLocalizedArchitectPath("dashboard", locale));
    }
    redirect(`${getLocalizedPath("/checkout", locale)}?need=journey_access`);
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
