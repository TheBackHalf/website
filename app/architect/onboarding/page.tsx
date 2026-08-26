import type { Metadata } from "next";
import { OnboardingPage } from "@/components/onboarding/onboarding-page";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";

export const metadata: Metadata = createArchitectPageMetadata("en", "onboarding");

export default async function ArchitectOnboardingIndexPage() {
  return <OnboardingPage locale="en" />;
}
