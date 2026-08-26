import type { Metadata } from "next";
import { PrivacyRequestPageView } from "@/components/privacy/privacy-request-page-view";

export const metadata: Metadata = {
  title: "Solicitudes de derechos de privacidad — The Back Half",
  description:
    "Solicita acceso, corrección, eliminación, exportación o retiro de consentimiento para The Back Half.",
};

export default function EsPrivacyRequestPage() {
  return <PrivacyRequestPageView locale="es" />;
}
