import { redirect } from "next/navigation";
import { AppShellPage } from "@/components/app-shell/app-shell-page";
import { Chapter4Experience } from "@/components/journey/chapter-4/chapter-4-experience";
import {
  resolveChapter4DisplayName,
  type Chapter4SectionId,
} from "@/content/journey/chapter-4-standards";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { getLoginPath } from "@/lib/auth/routing";
import { getLocalizedPath } from "@/lib/i18n/routing";
import { loadChapter4ForUser } from "@/lib/journey/chapters/chapter-4-service";
import { getChapter4Path } from "@/lib/journey/chapters/paths";
import { redirectIfOnboardingIncomplete } from "@/lib/journey/onboarding/gate";
import type { Locale } from "@/lib/i18n/config";

type Chapter4PageProps = {
  locale: Locale;
  sectionId: Chapter4SectionId;
};

export async function Chapter4Page({ locale, sectionId }: Chapter4PageProps) {
  const path = getChapter4Path(locale, sectionId);

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

  const loaded = await loadChapter4ForUser(actor.user.id);
  if (loaded.status === "blocked") {
    if (loaded.reason === "community_only") {
      redirect(getLocalizedArchitectPath("dashboard", locale));
    }
    redirect(`${getLocalizedPath("/checkout", locale)}?need=journey_access`);
  }

  return (
    <AppShellPage locale={locale} className="bh-chapter-1-page">
      <div className="bh-onboarding-panel pb-16">
        <Chapter4Experience
          locale={locale}
          firstName={resolveChapter4DisplayName(
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
