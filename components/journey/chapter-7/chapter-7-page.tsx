import { redirect } from "next/navigation";
import { AppShellPage } from "@/components/app-shell/app-shell-page";
import { Chapter7Experience } from "@/components/journey/chapter-7/chapter-7-experience";
import { type Chapter7SectionId } from "@/content/journey/chapter-7-beginning";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { getLoginPath } from "@/lib/auth/routing";
import { getLocalizedPath } from "@/lib/i18n/routing";
import { userHasActiveEntitlement } from "@/lib/billing/entitlements";
import { loadChapter7ForUser } from "@/lib/journey/chapters/chapter-7-service";
import { getChapter7Path } from "@/lib/journey/chapters/paths";
import { redirectIfOnboardingIncomplete } from "@/lib/journey/onboarding/gate";
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
  if (loaded.status === "blocked") {
    if (loaded.reason === "community_only") {
      redirect(getLocalizedArchitectPath("dashboard", locale));
    }
    redirect(`${getLocalizedPath("/checkout", locale)}?need=journey_access`);
  }

  const communityAccess = await userHasActiveEntitlement(
    actor.user.id,
    "community_access",
  );

  return (
    <AppShellPage locale={locale} className="bh-chapter-1-page">
      <div className="bh-onboarding-panel pb-16">
        <Chapter7Experience
          locale={locale}
          sectionId={sectionId}
          record={loaded.record}
          communityAccess={communityAccess}
        />
      </div>
    </AppShellPage>
  );
}
