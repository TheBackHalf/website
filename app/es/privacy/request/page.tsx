import type { Metadata } from "next";
import { PrivacyRequestPageView } from "@/components/privacy/privacy-request-page-view";
import { loadPrivacyRequestPageDefaults } from "@/lib/privacy/request-page-defaults";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Solicitudes de derechos de privacidad — The Back Half",
  description:
    "Solicita acceso, corrección, eliminación, exportación o retiro de consentimiento para The Back Half.",
};

export default async function EsPrivacyRequestPage() {
  const { sessionVerified, defaults } = await loadPrivacyRequestPageDefaults();
  return (
    <PrivacyRequestPageView
      locale="es"
      defaults={defaults}
      sessionVerified={sessionVerified}
    />
  );
}
