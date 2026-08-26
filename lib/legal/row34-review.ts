import {
  CHECKOUT_DISCLOSURE_REVIEW,
  COMMUNITY_GUIDELINES,
  CONSISTENCY_MATRIX,
  COUNSEL_RECOMMENDATIONS,
  INDEPENDENT_COUNSEL,
  IP_REVIEW,
  RISK_REGISTER,
  ROW34_AUDIT_DATE,
  ROW34_AUTHORITY_PATH,
  ROW34_RERUN,
  ROW34_TITLE,
  ROW34_VERSION,
  auditCatalogDocuments,
  getRow34StaticVerdicts,
  riskCounts,
  row32Reconciliation,
  row33Reconciliation,
  row34DefectsCorrected,
  row34FounderJudgment,
  row34RemainingBlockers,
  row60Impact,
} from "@/lib/legal/row34-audit";

export function getRow34ReviewModel() {
  const blockers = row34RemainingBlockers();
  const counts = riskCounts();
  const verdicts = getRow34StaticVerdicts();
  const published = auditCatalogDocuments().every((document) => document.published);
  const launchBlockers = RISK_REGISTER.filter(
    (risk) => risk.currentClassification === "STILL OPEN — LAUNCH BLOCKER",
  );
  const readyForFounderAcceptance =
    blockers.length === 0 && published && launchBlockers.length === 0;

  return {
    title: ROW34_TITLE,
    version: ROW34_VERSION,
    auditDate: ROW34_AUDIT_DATE,
    rerun: ROW34_RERUN,
    authorityPath: ROW34_AUTHORITY_PATH,
    independentCounsel: INDEPENDENT_COUNSEL,
    documents: auditCatalogDocuments(),
    communityGuidelines: COMMUNITY_GUIDELINES,
    matrix: CONSISTENCY_MATRIX,
    risks: RISK_REGISTER,
    counts,
    ip: IP_REVIEW,
    checkout: CHECKOUT_DISCLOSURE_REVIEW,
    defectsCorrected: row34DefectsCorrected,
    founderJudgment: row34FounderJudgment,
    counselRecommendations: COUNSEL_RECOMMENDATIONS,
    blockers,
    verdicts,
    row32: row32Reconciliation(),
    row33: row33Reconciliation(),
    row60: row60Impact(),
    readyForFounderAcceptance,
    finalStatus: readyForFounderAcceptance
      ? "ROW 34 — READY FOR FOUNDER ACCEPTANCE"
      : "ROW 34 — NOT COMPLETE",
    reviewUrl: "http://localhost:3000/_internal/row34-human-legal-launch-review",
    attorneyReviewClaimed: false,
    markedComplete: false,
  };
}
