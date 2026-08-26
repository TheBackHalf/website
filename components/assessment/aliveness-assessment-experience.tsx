"use client";

import { useRouter } from "next/navigation";
import { AlivenessAssessmentForm } from "@/components/assessment/aliveness-assessment-form";
import type { AlivenessAssessmentState } from "@/lib/journey/onboarding/types";
import type { Locale } from "@/lib/i18n/config";

type AlivenessAssessmentExperienceProps = {
  locale: Locale;
  assessment: AlivenessAssessmentState;
  resultsPath: string;
};

export function AlivenessAssessmentExperience({
  locale,
  assessment,
  resultsPath,
}: AlivenessAssessmentExperienceProps) {
  const router = useRouter();

  return (
    <AlivenessAssessmentForm
      locale={locale}
      assessment={assessment}
      mode="experience"
      showSaveButton
      showCompleteButton
      onComplete={() => {
        router.replace(resultsPath);
        router.refresh();
      }}
    />
  );
}
