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

export const metadata: Metadata = createArchitectPageMetadata("es", "dashboard");

export default async function EsArchitectDashboardPage() {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      redirect(`${getLoginPath("es")}?next=/es/architect/dashboard`);
    }
    throw error;
  }

  await redirectIfOnboardingIncomplete(actor.user.id, "es");

  let model = null;
  let loadError = false;
  try {
    model = await getArchitectDashboardForUser(actor.user.id, "es");
    if (!model) {
      loadError = true;
    }
  } catch {
    loadError = true;
  }

  return (
    <DashboardShell locale="es" model={model} loadError={loadError} />
  );
}
