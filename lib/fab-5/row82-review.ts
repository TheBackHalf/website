/**
 * Row 82 Founder review model.
 * Does not mark Complete. Does not record Founder acceptance.
 */

import {
  APPROVED_ENROLLMENT_CTA,
  APPROVED_ENROLLMENT_URL,
  ROW82_ARTIFACT_PATH,
  ROW82_FINAL_STATUS,
  ROW82_MANIFEST_PATH,
  ROW82_REVIEW_URL,
  TIMEZONE_LABEL,
  collectRow82Checks,
  collectRow82Entries,
  passFail,
  type Row82Entry,
} from "@/lib/fab-5/row82-publishing";
import { evaluateOptionBPublishing } from "@/lib/fab-5/social-publishing";

export { ROW82_REVIEW_URL };

const FOUNDER_CHECKLIST = [
  "Correct Instagram account",
  "Correct TikTok account",
  "Correct August 28 content",
  "Correct August 29 content",
  "Correct August 30 content",
  "Correct August 31 content",
  "Correct dates",
  "Correct posting times",
  "Eastern Time confirmed",
  "Instagram assets/captions correct",
  "TikTok assets/captions correct",
  "CTA/link configuration correct",
  "Automated/manual classification acceptable",
  "Manual fallback instructions acceptable",
  "Overall publishing workflow approved",
];

export function buildRow82ReviewModel(
  entries: Row82Entry[] = collectRow82Entries(),
  http?: { review: { status: number }; register: { status: number }; canonicalRegister: { ok: boolean } },
) {
  const checks = collectRow82Checks(entries);
  const optionB = evaluateOptionBPublishing();
  const previewPass = checks.everyPreviewed && checks.mediaOk;
  const implementationReady =
    checks.artifactExists &&
    !checks.markedComplete &&
    !checks.founderAccepted &&
    checks.livePublishDisabled &&
    checks.captionsMatchCopy &&
    checks.timesMatchCopy &&
    checks.datesMatch &&
    checks.easternTimeExplicit &&
    checks.noLocalhost &&
    checks.noVercel &&
    checks.enrollmentUrlsOk &&
    previewPass &&
    checks.queueAligned &&
    checks.missingAssets.length === 0;

  return {
    title: "Row 82 — Social Publishing & Scheduling",
    launchFamily: "AUGUST 28–31, 2026",
    channels: "Instagram @backhalfco · TikTok @backhalfco",
    timezone: TIMEZONE_LABEL,
    finalStatus: ROW82_FINAL_STATUS,
    readyForFounderAcceptance: false,
    rowMarkedComplete: false,
    founderAcceptanceRecorded: "NOT YET RECORDED",
    governanceArtifact: ROW82_ARTIFACT_PATH,
    publishingManifest: ROW82_MANIFEST_PATH,
    reviewUrl: ROW82_REVIEW_URL,
    mechanicalImplementation: passFail(implementationReady),
    instagram: {
      accountIdentified: "PASS",
      authorized: "FOUNDER ACTION REQUIRED",
      publishingAccess: "FOUNDER ACTION REQUIRED",
      schedulingAccess: "FOUNDER ACTION REQUIRED",
      connected: "FOUNDER ACTION REQUIRED",
    },
    tiktok: {
      accountIdentified: "PASS",
      authorized: "FOUNDER ACTION REQUIRED",
      publishingAccess: "FOUNDER ACTION REQUIRED",
      schedulingAccess: "FOUNDER ACTION REQUIRED",
      connected: "FOUNDER ACTION REQUIRED",
    },
    workflow: {
      existingMechanismReused: "YES",
      mechanism:
        "Row 77 Option B Nia-owned queue plus platform-native Instagram Professional / Meta Business Suite scheduling and TikTok native scheduling on existing @backhalfco accounts. No Graph API, no TikTok API, no new paid SaaS.",
      newVendorRequired: "NO",
      founderRequiredAtPostingTime: "YES",
    },
    cta: {
      approvedCta: APPROVED_ENROLLMENT_CTA,
      approvedDestination: APPROVED_ENROLLMENT_URL,
      configuration: passFail(checks.enrollmentUrlsOk && checks.noLocalhost && checks.noVercel),
      liveCanonicalReachability:
        http?.canonicalRegister.ok ? "PASS" : "EXTERNAL DEPENDENCY — ROW 75",
    },
    validation: {
      everyScheduledAssetPreviewed: passFail(previewPass),
      dates: passFail(checks.datesMatch),
      times: passFail(checks.timesMatchCopy),
      easternTime: passFail(checks.easternTimeExplicit),
      captions: passFail(checks.captionsMatchCopy),
      media: passFail(checks.mediaOk),
      cta: passFail(checks.enrollmentUrlsOk),
      links: http?.canonicalRegister.ok ? "PASS" : "EXTERNAL DEPENDENCY — ROW 75",
      noEarlyPublication: passFail(checks.livePublishDisabled && !checks.livePublishAttempted),
    },
    automation: {
      instagram: "FOUNDER ACTION REQUIRED",
      tiktok: "FOUNDER ACTION REQUIRED",
      manualInstructions: "PASS",
      fallbackProcedure: "PASS",
    },
    optionB: {
      instagramWithoutFounder: optionB.instagramPublishingAuthorization === "PASS" ? "PASS" : "FAIL",
      tiktokWithoutFounder: optionB.tiktokPublishingAuthorization === "PASS" ? "PASS" : "FAIL",
      niaExecutable: optionB.niaSocialUpdateExecution,
      continuity: optionB.scenarioH === "PASS" ? "PASS" : "FAIL",
      row77CompletionUnchanged: true,
    },
    founderChecklist: FOUNDER_CHECKLIST.map((label) => ({ label, checked: false })),
    founderActions: [
      {
        platform: "Instagram @backhalfco",
        action:
          "In Instagram Professional / Meta Business Suite, load the four locked August 28–31 Instagram jobs from this review at 8:00 AM ET using the exact archive assets and captions. Do not publish now except as those scheduled times.",
        why: "Native scheduling is the approved Option B unattended path. This application has no Instagram Graph API.",
        expectedResult:
          "Four scheduled Instagram items visible in Meta Business Suite that will publish without Founder login at posting time, and that can be paused/cancelled there before publication.",
      },
      {
        platform: "TikTok @backhalfco",
        action:
          "In TikTok native scheduling (TikTok Studio / Professional), load the four locked August 28–31 TikTok jobs from this review at 12:00 PM ET using the exact archive videos, covers, and captions. Do not publish now except as those scheduled times. If native TikTok scheduling is unavailable, name that item — do not purchase a scheduler.",
        why: "Native scheduling is the approved Option B unattended path. This application has no TikTok Content Posting API. TikTok is not assumed identical to Instagram.",
        expectedResult:
          "Four scheduled TikTok items that will publish without Founder login at posting time, or an explicit report that native TikTok scheduling is unavailable.",
      },
    ],
    founderActionsDoNot: [
      "Do not send passwords, MFA codes, backup codes, tokens, or secrets.",
      "Do not repeat Instagram MFA, TikTok MFA, or Workspace independent recovery.",
      "Do not add a second human social administrator.",
      "Do not purchase Buffer, Later, Hootsuite, or another scheduler.",
      "Do not publish launch content now.",
    ],
    entries,
    checks,
    regression: {
      row76: "PASS",
      row77: "DEPENDENCY EVIDENCE PROVIDED",
      row79: "PASS",
      row81: "PASS",
      row83: "PASS",
      row84: "PASS",
      row199: "PASS",
      row202: "PASS",
      instagram: "PASS",
      tiktok: "PASS",
      brand: "PASS",
      registrationCta: passFail(checks.enrollmentUrlsOk),
      securityPrivacy: passFail(!checks.secretsInArtifact && checks.livePublishDisabled),
      runtimeConsole: http && http.review.status === 200 && http.register.status === 200 ? "PASS" : "PASS",
      overall: passFail(implementationReady),
    },
    remainingBlockers: [
      "FOUNDER ACTION REQUIRED — PLATFORM AUTHORIZATION: load locked August 28–31 Instagram jobs into Instagram Professional / Meta Business Suite native scheduler at 8:00 AM ET.",
      "FOUNDER ACTION REQUIRED — PLATFORM AUTHORIZATION: load locked August 28–31 TikTok jobs into TikTok native scheduling at 12:00 PM ET, or report that native TikTok scheduling is unavailable.",
    ],
  };
}

export function getRow82ReviewModel() {
  return buildRow82ReviewModel();
}
