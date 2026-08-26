export {
  createFileJourneyOnboardingStore,
  getJourneyOnboardingStore,
  setJourneyOnboardingStoreForTests,
  nextStepAfter,
  stepIndex,
} from "@/lib/journey/onboarding/store";
export type { JourneyOnboardingStore } from "@/lib/journey/onboarding/store";
export {
  ONBOARDING_STEPS,
  isOnboardingStepId,
  createEmptyOnboardingRecord,
} from "@/lib/journey/onboarding/types";
export type {
  OnboardingRecord,
  OnboardingStepId,
  OnboardingStatus,
  AlivenessAssessmentState,
  AlivenessRating,
  AlivenessResultsSnapshot,
} from "@/lib/journey/onboarding/types";
export {
  resolveJourneyOnboardingEligibility,
  getOnboardingStateForUser,
  isOnboardingComplete,
  userHasJourneyAccess,
} from "@/lib/journey/onboarding/eligibility";
export {
  advanceOnboardingStep,
  saveAssessmentResponsesForUser,
  loadOnboardingForEntitledUser,
  canAccessOnboardingStep,
  resolveResumeStep,
  hasVerifiedJourneyPurchase,
} from "@/lib/journey/onboarding/service";
export { getOnboardingPath } from "@/lib/journey/onboarding/paths";
export {
  redirectIfOnboardingIncomplete,
  redirectForOnboardingAccess,
} from "@/lib/journey/onboarding/gate";
export { getFounderWelcomeContent, getFounderWelcomeParagraphs } from "@/lib/journey/onboarding/welcome";
export type { FounderWelcomeContent } from "@/lib/journey/onboarding/welcome";
export {
  getJourneyOnboardingConsentDocuments,
  listMissingRequiredOnboardingConsents,
  hasAllRequiredOnboardingConsents,
} from "@/lib/journey/onboarding/consent";
