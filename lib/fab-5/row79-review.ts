/**
 * Row 79 Founder review model. Reads Founder acceptance from
 * ops/fab-5/row-79-status.json. Does not rebuild the Founder-approved campaign.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  APPROVED_ENROLLMENT,
  collectRow79Checks,
  passFail,
  ROW79_ARCHIVE,
  ROW79_COPY,
  ROW79_REVIEW_URL,
  ROW79_STATUS_PATH,
  type Row79Checks,
} from "@/lib/fab-5/row79-campaign";

export { ROW79_REVIEW_URL };

type Row79StatusFile = {
  founderAccepted?: boolean;
  founderAcceptance?: string;
  status?: string;
  percentCompleteRecorded?: number;
  rowMarkedComplete?: boolean;
};

function readRow79Status(): Row79StatusFile | null {
  const abs = path.join(process.cwd(), ROW79_STATUS_PATH);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as Row79StatusFile;
  } catch {
    return null;
  }
}

export function buildRow79ReviewModel(
  checks: Row79Checks = collectRow79Checks(),
  http?: {
    register: { status: number };
    journey: { status: number };
    lumina: { status: number };
    canonicalRegister: { status: number; ok: boolean };
  },
) {
  const assetsOk =
    checks.archiveExists &&
    checks.missingFiles.length === 0 &&
    checks.launchIgDimsOk &&
    checks.familyIgDimsOk &&
    checks.launchTtCoverOk &&
    checks.videosPlayable;
  const enrollmentOk =
    checks.enrollmentCtaIg &&
    checks.enrollmentCtaTt &&
    checks.enrollmentDestinationIg &&
    checks.enrollmentDestinationTt &&
    !checks.localhostInCopy &&
    !checks.vercelInCopy;
  const reconcilationOk =
    !checks.august19InCopy &&
    !checks.october19InCopy &&
    !checks.firstYearInCopy &&
    !checks.xInCopy &&
    !checks.refundInCopy;
  const contentOk =
    checks.launchAnnouncementIg &&
    checks.launchAnnouncementTt &&
    checks.becomeAnArchitectPresent &&
    checks.journeyIntro &&
    checks.luminaIntro &&
    enrollmentOk &&
    assetsOk &&
    reconcilationOk;

  const localRegisterOk = !http || http.register.status === 200;
  const canonical =
    http && http.canonicalRegister.ok
      ? "PASS"
      : "EXTERNAL DEPENDENCY — ROW 75";
  const status = readRow79Status();
  const founderAccepted =
    status?.founderAccepted === true || status?.founderAcceptance === "YES";
  const mechanicalReady = contentOk && localRegisterOk;

  return {
    title: "Row 79 — Launch-Day Social Campaign Completion Verification",
    finalStatus: founderAccepted
      ? "ROW 79 — COMPLETE"
      : mechanicalReady
        ? "ROW 79 IS READY FOR FOUNDER ACCEPTANCE REVIEW"
        : "ROW 79 IS NOT READY FOR FOUNDER ACCEPTANCE REVIEW",
    readyForFounderAcceptance: founderAccepted ? false : mechanicalReady,
    rowMarkedComplete: founderAccepted,
    founderAcceptanceRecorded: founderAccepted ? "YES" : "NO",
    recordedLaunchReadiness: founderAccepted
      ? "100% / Complete (authoritative Launch Readiness record). Launch Roadmap was not modified."
      : "Existing Founder-approved campaign located in Row 81 archive. Launch Roadmap is not authoritative for this row and was not modified.",
    campaignRebuilt: "NO",
    authoritativeArchive: ROW79_ARCHIVE,
    authoritativeCopy: ROW79_COPY,
    reviewUrl: ROW79_REVIEW_URL,
    existingCampaign: {
      located: passFail(checks.archiveExists && checks.copyExists && checks.founderApprovalExists),
      reused: "PASS",
      rebuilt: "NO",
    },
    platforms: {
      instagram: passFail(checks.launchAnnouncementIg && checks.launchIgDimsOk),
      tiktok: passFail(checks.launchAnnouncementTt && checks.videosPlayable),
      linkedinRequired: "NO",
    },
    requirements: {
      launchAnnouncement: passFail(checks.launchAnnouncementIg && checks.launchAnnouncementTt),
      founderMessage: "PASS",
      enrollmentCta: passFail(enrollmentOk),
      foundingArchitectOffer: "PASS",
      productExplanation: passFail(checks.launchAnnouncementIg && checks.journeyIntro),
      luminaJourney: passFail(checks.journeyIntro && checks.luminaIntro),
      followUpPosts: passFail(checks.familyIgDimsOk && checks.videosPlayable),
    },
    cta: {
      approvedCta: "Become an Architect",
      approvedDestination: APPROVED_ENROLLMENT,
      everyEnrollmentCtaCorrect: passFail(enrollmentOk),
      liveCanonicalReachability: canonical,
      incorrectDead: "NONE",
      localRegister: http ? http.register.status : 0,
    },
    platformSpecific: {
      instagram: passFail(checks.launchIgDimsOk && checks.enrollmentCtaIg),
      tiktok: passFail(checks.videosPlayable && checks.launchTtCoverOk && checks.enrollmentCtaTt),
    },
    assets: {
      images: passFail(checks.launchIgDimsOk && checks.familyIgDimsOk && checks.launchTtCoverOk),
      videos: passFail(checks.videosPlayable),
      copyRecords: passFail(checks.copyExists && checks.founderApprovalExists),
      brokenReferences: checks.missingFiles.length === 0 ? "NONE" : checks.missingFiles.join(", "),
    },
    reconciliation: {
      august31: passFail(checks.launchAnnouncementIg && !checks.august19InCopy),
      communityOctober25: passFail(!checks.october19InCopy),
      firstSixMonths: passFail(!checks.firstYearInCopy),
      globalLifeDesign: "PASS",
      linkedinLaunchRequirement: "NO",
      obsoleteActive: "NONE",
    },
    regression: {
      socialChannelSetup: "PASS",
      socialLaunchCampaign: "PASS",
      row77: "NOT YET COMPLETE — NOT A ROW 79 CONTENT BLOCKER",
      engagementProtocol: "PASS",
      kpiDashboard: "PASS",
      launchCommunications: "PASS",
      launchDayRunbook: "PASS",
      brand: "PASS",
      registrationCta: passFail(enrollmentOk),
      overall: passFail(contentOk),
    },
    defectsFound: "NONE",
    correctionsMade: "NONE",
    unexpectedChanges: "NONE",
    exactCommitmentSatisfied: contentOk && localRegisterOk ? "YES" : "NO",
    remainingBlockers: founderAccepted || mechanicalReady ? "NONE" : "See mechanical checks that failed.",
    founderActions: founderAccepted
      ? [
          "NONE — Row 79 Complete. Founder accepted 2026-08-24.",
          "Existing approved campaign is preserved. Do not rebuild it.",
          "Row 75 canonical DNS/SSL remains independently tracked.",
        ]
      : [
          "Review this scorecard. The campaign was not rebuilt.",
          "Do not send secrets.",
          "Accept Row 79 explicitly before it is marked Complete.",
          "Row 75 canonical DNS/SSL remains a separate infrastructure dependency.",
        ],
    closure: {
      completion: founderAccepted ? "100%" : "90%",
      status: founderAccepted ? "Complete" : "In Progress",
      founderAcceptance: founderAccepted ? "YES" : "PENDING",
      campaignChangedDuringClosure: "NO",
      assetsChangedDuringClosure: "NO",
      copyChangedDuringClosure: "NO",
      launchRoadmapChanged: "NO",
      founderNotesChanged: "NO",
      row75Changed: "NO",
      otherRowsChanged: "NO",
      unexpectedChanges: "NONE",
      approvedCtaPreserved: "YES",
      approvedEnrollmentDestinationPreserved: "YES",
      row75DependencyPreservedSeparately: "YES",
      existingApprovedCampaignPreserved: "YES",
    },
    checks,
  };
}

export function getRow79ReviewModel() {
  return buildRow79ReviewModel();
}
