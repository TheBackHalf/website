import { ProfilePreferencesForm } from "@/components/account/profile-preferences-form";
import {
  AppShellPage,
  AppShellPageHeader,
} from "@/components/app-shell/app-shell-page";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import type {
  ArchitectProfileView,
  ConsentHistoryItem,
} from "@/lib/account/profile";
import type { LuminaMemoryControlsView } from "@/lib/lumina/memory/types";
import type { Locale } from "@/lib/i18n/config";

type SettingsShellProps = {
  locale: Locale;
  profile: ArchitectProfileView;
  consents: ConsentHistoryItem[];
  timeZones: string[];
  memoryControls: LuminaMemoryControlsView | null;
};

/**
 * Settings page shell — Row 65 profile/preferences experience.
 * @see lib/app-shell/integration-points.ts → profile
 */
export function SettingsShell({
  locale,
  profile,
  consents,
  timeZones,
  memoryControls,
}: SettingsShellProps) {
  const settings = getDictionary(locale).appShell.settings;

  return (
    <AppShellPage locale={locale}>
      <AppShellPageHeader
        title={resolveAppShellLabel(locale, settings.title)}
        description={settings.description}
      />

      <ProfilePreferencesForm
        locale={locale}
        profile={profile}
        consents={consents}
        timeZones={timeZones}
        memoryControls={memoryControls}
      />
    </AppShellPage>
  );
}
