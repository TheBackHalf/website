import type { Metadata } from "next";
import { PrivacyRightsConsole } from "@/components/privacy/privacy-rights-console";
import { roleHasPermission } from "@/lib/auth/permissions";
import { getServerSession } from "@/lib/auth/session/server";
import { buildPrivacyMetrics } from "@/lib/privacy/metrics";
import { getPrivacyStore } from "@/lib/privacy/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy rights — The Back Half",
  robots: { index: false, follow: false },
};

export default async function PrivacyRightsAdminPage() {
  const session = await getServerSession();
  const canAccess = session
    ? roleHasPermission(session.role, "admin:ops:access")
    : false;
  const requests = canAccess
    ? await getPrivacyStore().list({ includeTest: false })
    : [];
  return (
    <PrivacyRightsConsole
      requests={requests}
      metrics={buildPrivacyMetrics(requests)}
    />
  );
}
