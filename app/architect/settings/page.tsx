import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsShell } from "@/components/app-shell/settings-shell";
import {
  getArchitectProfileForSession,
  getConsentHistoryForSession,
} from "@/lib/account/get-profile";
import { listIanaTimeZones } from "@/lib/account/time-zones";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { getLoginPath } from "@/lib/auth/routing";
import { getLuminaMemoryControlsForSession } from "@/lib/lumina/memory/get-controls";

export const metadata: Metadata = createArchitectPageMetadata("en", "settings");

export default async function ArchitectSettingsPage() {
  const profile = await getArchitectProfileForSession();

  if (!profile) {
    redirect(`${getLoginPath("en")}?next=/architect/settings`);
  }

  const [consents, memoryControls] = await Promise.all([
    getConsentHistoryForSession(),
    getLuminaMemoryControlsForSession(),
  ]);

  return (
    <SettingsShell
      locale="en"
      profile={profile}
      consents={consents}
      timeZones={listIanaTimeZones()}
      memoryControls={memoryControls}
    />
  );
}
