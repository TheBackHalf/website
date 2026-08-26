import type { Metadata } from "next";
import { SupportTicketConsole } from "@/components/support/support-ticket-console";
import { roleHasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session/server";
import { getSupportStore } from "@/lib/support/store";
import { buildSupportMetrics } from "@/lib/support/metrics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Support tickets — The Back Half",
  robots: { index: false, follow: false },
};

export default async function SupportTicketsPage() {
  const session = await getServerSession();
  const canAccessAdminOps = session
    ? roleHasPermission(session.role, "admin:ops:access")
    : false;
  const tickets = await getSupportStore().list({ includeTest: false });
  const metrics = buildSupportMetrics(tickets);
  return (
    <SupportTicketConsole
      tickets={tickets}
      metrics={metrics}
      canAccessAdminOps={canAccessAdminOps}
    />
  );
}
