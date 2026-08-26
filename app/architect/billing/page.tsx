import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BillingShell } from "@/components/app-shell/billing-shell";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { requireAuthenticatedUser } from "@/lib/auth/access";
import { AccessDeniedError } from "@/lib/auth/access";
import { getLoginPath } from "@/lib/auth/routing";
import { getBillingSummaryForUser } from "@/lib/billing/summary";

export const metadata: Metadata = createArchitectPageMetadata("en", "billing");

export default async function ArchitectBillingPage() {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      redirect(`${getLoginPath("en")}?next=/architect/billing`);
    }
    throw error;
  }

  const summary = await getBillingSummaryForUser(actor.user.id);
  return <BillingShell locale="en" summary={summary} />;
}
