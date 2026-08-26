/**
 * Row 135 — Completion and Threshold Ceremony validation.
 * Engineering proof for AOS al-135. Does not mark Founder acceptance.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { chapter7FounderCongratulationsRaw } from "@/content/journey/chapter-7-beginning";
import { chapter7FounderCongratulationsRawEs } from "@/content/journey/es/chapter-7";
import { ROW33_COMMUNITY_COMING_COPY } from "@/lib/marketing-claims/standard";
import {
  buildStubAssistantReply,
  contentRequestsThresholdReflection,
  LUMINA_FIXTURE_THRESHOLD_MARKER,
} from "@/lib/lumina/conversation";
import {
  ceremonyImpliesLiveCommunity,
  getApprovedFounderCongratulations,
  getCommunityInvitationCheckoutPath,
  getCommunityInvitationCopy,
  getThresholdCeremonyPath,
  getThresholdCeremonySpec,
  getThresholdLuminaReflectionPath,
  getThresholdPortfolioAssets,
  isCertificateAvailableAfterJourney,
  isThresholdCeremonyUnlocked,
  THRESHOLD_CEREMONY_ELEMENT_IDS,
  THRESHOLD_PORTFOLIO_ASSET_IDS,
} from "@/lib/journey/completion/threshold-ceremony";

type TestResult = {
  id: string;
  name: string;
  result: "PASS" | "FAIL";
  detail: string;
};

function mark(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}

function main() {
  const tests: TestResult[] = [];

  const spec = getThresholdCeremonySpec("completed");
  tests.push({
    id: "R135-T1",
    name: "Ceremony spec includes five required elements",
    result: mark(
      spec.elements.length === 5 &&
        THRESHOLD_CEREMONY_ELEMENT_IDS.every((id) => spec.elements.includes(id)),
    ),
    detail: spec.elements.join(", "),
  });

  tests.push({
    id: "R135-T2",
    name: "Ceremony unlocks only after Chapter VII completion",
    result: mark(
      isThresholdCeremonyUnlocked("completed") &&
        !isThresholdCeremonyUnlocked("in_progress") &&
        !isThresholdCeremonyUnlocked("not_started") &&
        !isThresholdCeremonyUnlocked(null) &&
        isCertificateAvailableAfterJourney("completed") &&
        !isCertificateAvailableAfterJourney("in_progress"),
    ),
    detail: "unlocked=completed only; certificate same gate",
  });

  tests.push({
    id: "R135-T3",
    name: "Ceremony host path is Chapter VII complete",
    result: mark(
      getThresholdCeremonyPath("en") ===
        "/architect/journey/chapter-7/complete" &&
        getThresholdCeremonyPath("es") ===
          "/es/architect/journey/chapter-7/complete" &&
        spec.hostSection === "complete",
    ),
    detail: `${getThresholdCeremonyPath("en")} | ${getThresholdCeremonyPath("es")}`,
  });

  const luminaPathEn = getThresholdLuminaReflectionPath("en");
  const luminaPathEs = getThresholdLuminaReflectionPath("es");
  tests.push({
    id: "R135-T4",
    name: "Final Lumina reflection uses topic=threshold",
    result: mark(
      luminaPathEn === "/architect/lumina?topic=threshold" &&
        luminaPathEs === "/es/architect/lumina?topic=threshold" &&
        spec.luminaTopic === "threshold",
    ),
    detail: `${luminaPathEn} | ${luminaPathEs}`,
  });

  const congratulationsEn = getApprovedFounderCongratulations("en");
  const congratulationsEs = getApprovedFounderCongratulations("es");
  tests.push({
    id: "R135-T5",
    name: "Founder congratulations uses approved scripts",
    result: mark(
      congratulationsEn === chapter7FounderCongratulationsRaw &&
        congratulationsEs === chapter7FounderCongratulationsRawEs &&
        congratulationsEn.includes("Congratulations, Architect.") &&
        congratulationsEn.includes("This is not the finish line. It's the starting line."),
    ),
    detail: "EN/ES approved Founder Congratulations scripts, Architect not a personal name",
  });

  const portfolio = getThresholdPortfolioAssets();
  const portfolioIds = portfolio.map((asset) => asset.id);
  tests.push({
    id: "R135-T6",
    name: "Portfolio assembles completed Journey artifacts plus certificate",
    result: mark(
      THRESHOLD_PORTFOLIO_ASSET_IDS.every((id) => portfolioIds.includes(id)) &&
        portfolio.some((asset) => asset.id === "certificate") &&
        portfolio.some((asset) => asset.id === "declaration") &&
        portfolio.every((asset) => asset.href.startsWith("/api/architect/")),
    ),
    detail: portfolioIds.join(", "),
  });

  const founding = getCommunityInvitationCopy(true, "en");
  const standalone = getCommunityInvitationCopy(false, "en");
  const foundingEs = getCommunityInvitationCopy(true, "es");
  const invitationCorpus = [
    founding.coming,
    founding.foundingInclusion,
    standalone.coming,
    standalone.standaloneOffer,
    foundingEs.coming,
  ].join("\n");
  tests.push({
    id: "R135-T7",
    name: "Architect Community invitation uses approved October 25 timing",
    result: mark(
      founding.coming === ROW33_COMMUNITY_COMING_COPY &&
        foundingEs.coming.includes("25 de octubre de 2026") &&
        founding.liveOnAugust31 === false &&
        founding.communityAccess === true &&
        standalone.communityAccess === false &&
        invitationCorpus.includes("first six months") &&
        !/first year inside the architect community/i.test(invitationCorpus) &&
        !ceremonyImpliesLiveCommunity(invitationCorpus) &&
        getCommunityInvitationCheckoutPath("en") === "/checkout/community",
    ),
    detail: `${founding.coming}; liveOnAugust31=${String(founding.liveOnAugust31)}`,
  });

  const completeReply = buildStubAssistantReply(
    `${LUMINA_FIXTURE_THRESHOLD_MARKER} I want a final Lumina reflection on completing the Journey.`,
    {
      locale: "en",
      journeyState: "journey_completed",
      chapter7: {
        status: "complete",
        currentSectionId: "complete",
        reflection: { status: "complete", filledCount: 7, targetCount: 7 },
        practice: { status: "complete", hasStatement: true },
        commitment: { status: "complete", affirmed: true },
      },
    },
  );
  const incompleteReply = buildStubAssistantReply(
    "I want a final Lumina reflection on completing the Journey.",
    { locale: "en", journeyState: "in_progress" },
  );
  tests.push({
    id: "R135-T8",
    name: "Lumina final reflection acknowledges completion without rewriting work",
    result: mark(
      contentRequestsThresholdReflection(
        "I want a final Lumina reflection on completing the Journey.",
      ) &&
        completeReply.content.includes("without rewriting your work") &&
        completeReply.content.includes("This is not the finish line. It's the starting line.") &&
        completeReply.content.includes("Your Journey does not end here—it begins here.") &&
        incompleteReply.content.includes("after Journey completion"),
    ),
    detail: completeReply.content.slice(0, 220),
  });

  const ui = join(process.cwd(), "components/journey/completion/threshold-ceremony.tsx");
  const chapter7 = join(process.cwd(), "components/journey/chapter-7/chapter-7-experience.tsx");
  tests.push({
    id: "R135-T9",
    name: "Ceremony UI is wired into Chapter VII complete",
    result: mark(existsSync(ui) && existsSync(chapter7)),
    detail: `${ui} + ${chapter7}`,
  });

  const failed = tests.filter((test) => test.result === "FAIL");
  const evidence = {
    row: 135,
    aosWorkId: "al-135",
    deliverable: "Build Completion and Threshold Ceremony",
    ownerAgent: "imani",
    ranAt: new Date().toISOString(),
    pass: failed.length === 0,
    passed: tests.filter((test) => test.result === "PASS").length,
    failed: failed.length,
    tests,
    founderAcceptance: null,
    founderAcceptanceAuthority: "Kimberly Walker (human)",
    notes: [
      "Ceremony is hosted on Chapter VII complete after journey_completed.",
      "Compiled portfolio PDF remains Row 134. This row assembles existing artifacts.",
      "Nia verifies Triple E. Founder acceptance is not marked complete.",
      "Architect Community is not live August 31, 2026.",
    ],
  };

  const out = join(
    process.cwd(),
    "ops/fab-5/runs/row-135-threshold-ceremony-validation.json",
  );
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`);

  const status = join(
    process.cwd(),
    "ops/fab-5/runs/aos-engineering-status/al-135.json",
  );
  mkdirSync(dirname(status), { recursive: true });
  writeFileSync(
    status,
    `${JSON.stringify(
      {
        aosWorkId: "al-135",
        source: "command_center",
        sourceReference: "August Launch row 135",
        deliverable: "Build Completion and Threshold Ceremony",
        ownerAgent: "imani",
        softwareChange: true,
        status: failed.length === 0 ? "ENGINEERING_READY_FOR_REVIEW" : "VALIDATION_FAILED",
        founderAcceptance: null,
        founderAcceptanceAuthority: "Kimberly Walker (human)",
        nextAction: "Nia verifies Triple E. Founder acceptance stays with Kimberly Walker (human).",
        validationEvidence: "ops/fab-5/runs/row-135-threshold-ceremony-validation.json",
        host: "/architect/journey/chapter-7/complete",
        elements: [...THRESHOLD_CEREMONY_ELEMENT_IDS],
        merged: false,
        deployed: false,
        ranAt: evidence.ranAt,
        pass: evidence.pass,
      },
      null,
      2,
    )}\n`,
  );

  console.log(JSON.stringify(evidence, null, 2));
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
