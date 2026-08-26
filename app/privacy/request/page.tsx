import type { Metadata } from "next";
import { PrivacyRequestPageView } from "@/components/privacy/privacy-request-page-view";

export const metadata: Metadata = {
  title: "Privacy rights requests — The Back Half",
  description:
    "Request access, correction, deletion, export, or consent withdrawal for The Back Half.",
};

export default function PrivacyRequestPage() {
  return <PrivacyRequestPageView locale="en" />;
}
