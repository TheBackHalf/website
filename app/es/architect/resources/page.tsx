import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResourcesShell } from "@/components/app-shell/resources-shell";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { getLoginPath } from "@/lib/auth/routing";
import { loadArchitectPortfolio } from "@/lib/blueprint/portfolio";

export const metadata: Metadata = createArchitectPageMetadata("es", "resources");

export default async function EsArchitectResourcesPage() {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      redirect(`${getLoginPath("es")}?next=/es/architect/resources`);
    }
    throw error;
  }

  let portfolio = null;
  try {
    portfolio = await loadArchitectPortfolio(actor.user.id);
  } catch {
    portfolio = null;
  }

  return <ResourcesShell locale="es" portfolio={portfolio} />;
}
