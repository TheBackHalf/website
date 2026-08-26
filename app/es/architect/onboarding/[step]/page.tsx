import type { Metadata } from "next";
import { OnboardingPage } from "@/components/onboarding/onboarding-page";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";

export const metadata: Metadata = createArchitectPageMetadata("es", "onboarding");

type PageProps = {
  params: Promise<{ step: string }>;
};

export default async function EsArchitectOnboardingStepPage({
  params,
}: PageProps) {
  const { step } = await params;
  return <OnboardingPage locale="es" stepParam={step} />;
}
