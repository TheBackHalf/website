import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/app-shell/dashboard-shell";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { getLoginPath } from "@/lib/auth/routing";
import { getArchitectDashboardForUser } from "@/lib/dashboard/architect-dashboard";
import { redirectIfOnboardingIncomplete } from "@/lib/journey/onboarding/gate";

export const metadata: Metadata = createArchitectPageMetadata("en", "dashboard");

export default async function ArchitectDashboardPage() {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      redirect(`${getLoginPath("en")}?next=/architect/dashboard`);
    }
    throw error;
  }

  await redirectIfOnboardingIncomplete(actor.user.id, "en");

  let model = null;
  let loadError = false;
  try {
    model = await getArchitectDashboardForUser(actor.user.id, "en");
    if (!model) {
      loadError = true;
    }
  } catch {
    loadError = true;
  }

  return (
    <DashboardShell locale="en" model={model} loadError={loadError} />
  );
}
