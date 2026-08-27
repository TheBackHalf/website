import type { Metadata } from "next";
import { PrivacyRequestPageView } from "@/components/privacy/privacy-request-page-view";
import { loadPrivacyRequestPageDefaults } from "@/lib/privacy/request-page-defaults";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy rights requests — The Back Half",
  description:
    "Request access, correction, deletion, export, or consent withdrawal for The Back Half.",
};

export default async function PrivacyRequestPage() {
  const { sessionVerified, defaults } = await loadPrivacyRequestPageDefaults();
  return (
    <PrivacyRequestPageView
      locale="en"
      defaults={defaults}
      sessionVerified={sessionVerified}
    />
  );
}
