import type { Metadata } from "next";
import { OnboardingPage } from "@/components/onboarding/onboarding-page";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";

export const metadata: Metadata = createArchitectPageMetadata("en", "onboarding");

type PageProps = {
  params: Promise<{ step: string }>;
};

export default async function ArchitectOnboardingStepPage({
  params,
}: PageProps) {
  const { step } = await params;
  return <OnboardingPage locale="en" stepParam={step} />;
}
