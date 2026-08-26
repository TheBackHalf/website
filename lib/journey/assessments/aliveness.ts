/**
 * Row 83/84 — Aliveness Index assessment helpers + results engine.
 * Scoring is deterministic and server-authoritative.
 */

import {
  ALIVENESS_INDEX_MAX_TOTAL,
  alivenessIndexDomains,
  isAlivenessAssessmentComplete,
  isAlivenessStatementId,
  listAlivenessStatementIds,
  scoreAlivenessDomain,
  scoreAlivenessTotal,
  type AlivenessDomainId,
} from "@/content/journey/aliveness-index";
import type {
  AlivenessAssessmentState,
  AlivenessRating,
  AlivenessResultsSnapshot,
} from "@/lib/journey/onboarding/types";

export type AlivenessDomainScore = {
  domainId: AlivenessDomainId;
  name: string;
  score: number;
  maxScore: 25;
};

export type AlivenessResults = {
  domainScores: AlivenessDomainScore[];
  total: number;
  maxTotal: typeof ALIVENESS_INDEX_MAX_TOTAL;
  highestDomains: AlivenessDomainId[];
  lowestDomains: AlivenessDomainId[];
  complete: boolean;
};

export function normalizeRating(value: unknown): AlivenessRating | null {
  if (value === 1 || value === "1") return 1;
  if (value === 2 || value === "2") return 2;
  if (value === 3 || value === "3") return 3;
  if (value === 4 || value === "4") return 4;
  if (value === 5 || value === "5") return 5;
  return null;
}

/**
 * Deterministic results from responses.
 * Highest/lowest use approved domain order as tie-break
 * (first in `alivenessIndexDomains` wins inclusion order; all ties included).
 */
export function computeAlivenessResults(
  responses: Record<string, number>,
): AlivenessResults {
  const domainScores: AlivenessDomainScore[] = [];
  let complete = true;

  for (const domain of alivenessIndexDomains) {
    const score = scoreAlivenessDomain(domain.id, responses);
    if (score === null) {
      complete = false;
      domainScores.push({
        domainId: domain.id,
        name: domain.name,
        score: 0,
        maxScore: 25,
      });
      continue;
    }
    domainScores.push({
      domainId: domain.id,
      name: domain.name,
      score,
      maxScore: 25,
    });
  }

  if (!complete) {
    return {
      domainScores,
      total: 0,
      maxTotal: ALIVENESS_INDEX_MAX_TOTAL,
      highestDomains: [],
      lowestDomains: [],
      complete: false,
    };
  }

  const total = scoreAlivenessTotal(responses) ?? 0;
  let maxScore = Number.NEGATIVE_INFINITY;
  let minScore = Number.POSITIVE_INFINITY;
  for (const entry of domainScores) {
    if (entry.score > maxScore) maxScore = entry.score;
    if (entry.score < minScore) minScore = entry.score;
  }

  // Preserve approved domain order for ties.
  const highestDomains = domainScores
    .filter((entry) => entry.score === maxScore)
    .map((entry) => entry.domainId);
  const lowestDomains = domainScores
    .filter((entry) => entry.score === minScore)
    .map((entry) => entry.domainId);

  return {
    domainScores,
    total,
    maxTotal: ALIVENESS_INDEX_MAX_TOTAL,
    highestDomains,
    lowestDomains,
    complete: true,
  };
}

export function buildResultsSnapshot(
  responses: Record<string, number>,
  completedAt = new Date().toISOString(),
): AlivenessResultsSnapshot | null {
  const results = computeAlivenessResults(responses);
  if (!results.complete) {
    return null;
  }
  return {
    domainScores: results.domainScores,
    total: results.total,
    maxTotal: results.maxTotal,
    highestDomains: results.highestDomains,
    lowestDomains: results.lowestDomains,
    completedAt,
  };
}

export function isAssessmentReviewOnly(
  assessment: AlivenessAssessmentState,
): boolean {
  return Boolean(assessment.completedAt || assessment.resultsSnapshot);
}

function withSnapshotIfComplete(
  assessment: AlivenessAssessmentState,
  now: string,
): AlivenessAssessmentState {
  if (!isAlivenessAssessmentComplete(assessment.responses)) {
    return assessment;
  }
  const completedAt = assessment.completedAt ?? now;
  const resultsSnapshot =
    assessment.resultsSnapshot ??
    buildResultsSnapshot(assessment.responses, completedAt);
  return {
    ...assessment,
    completedAt,
    ...(resultsSnapshot ? { resultsSnapshot } : {}),
  };
}

export function mergeAssessmentResponses(
  current: AlivenessAssessmentState,
  updates: Record<string, unknown>,
): AlivenessAssessmentState {
  const now = new Date().toISOString();

  // Review-only after complete — ignore client answer overwrites.
  if (isAssessmentReviewOnly(current)) {
    return withSnapshotIfComplete(
      {
        ...current,
        updatedAt: current.updatedAt || now,
      },
      now,
    );
  }

  const responses = { ...current.responses };

  for (const [statementId, raw] of Object.entries(updates)) {
    if (!isAlivenessStatementId(statementId)) {
      continue;
    }
    const rating = normalizeRating(raw);
    if (rating === null) {
      continue;
    }
    responses[statementId] = rating;
  }

  // Partial save never finalizes — completion requires the explicit complete path.
  return {
    responses,
    updatedAt: now,
  };
}

export function assessmentCompletionStats(
  assessment: AlivenessAssessmentState,
): {
  answered: number;
  total: number;
  complete: boolean;
  totalScore: number | null;
} {
  const ids = listAlivenessStatementIds();
  const answered = ids.filter((id) => assessment.responses[id] != null).length;
  return {
    answered,
    total: ids.length,
    complete: isAlivenessAssessmentComplete(assessment.responses),
    totalScore: scoreAlivenessTotal(assessment.responses),
  };
}

/** Server-side summary for Lumina Journey context (no raw response dump). */
export function toAlivenessContextSummary(
  assessment: AlivenessAssessmentState | null | undefined,
): {
  status: "not_started" | "in_progress" | "complete";
  total?: number;
  maxTotal?: number;
  domainScores?: AlivenessDomainScore[];
  highestDomains?: AlivenessDomainId[];
  lowestDomains?: AlivenessDomainId[];
  completedAt?: string;
} {
  if (!assessment) {
    return { status: "not_started" };
  }
  const answered = Object.keys(assessment.responses).length;
  if (assessment.resultsSnapshot) {
    return {
      status: "complete",
      total: assessment.resultsSnapshot.total,
      maxTotal: assessment.resultsSnapshot.maxTotal,
      domainScores: assessment.resultsSnapshot.domainScores,
      highestDomains: assessment.resultsSnapshot.highestDomains,
      lowestDomains: assessment.resultsSnapshot.lowestDomains,
      completedAt: assessment.resultsSnapshot.completedAt,
    };
  }
  if (isAlivenessAssessmentComplete(assessment.responses)) {
    const snapshot = buildResultsSnapshot(
      assessment.responses,
      assessment.completedAt,
    );
    if (snapshot) {
      return {
        status: "complete",
        total: snapshot.total,
        maxTotal: snapshot.maxTotal,
        domainScores: snapshot.domainScores,
        highestDomains: snapshot.highestDomains,
        lowestDomains: snapshot.lowestDomains,
        completedAt: snapshot.completedAt,
      };
    }
  }
  if (answered === 0) {
    return { status: "not_started" };
  }
  return { status: "in_progress" };
}
