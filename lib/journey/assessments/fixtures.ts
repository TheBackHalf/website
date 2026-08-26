/**
 * Row 84 — deterministic scoring fixtures (known domain sums).
 */

import {
  alivenessIndexDomains,
  listAlivenessStatementIds,
} from "@/content/journey/aliveness-index";
import type { AlivenessDomainId } from "@/content/journey/aliveness-index";
import { computeAlivenessResults } from "@/lib/journey/assessments/aliveness";

/** Fill every statement with the same rating. */
export function fillAllRatings(
  rating: 1 | 2 | 3 | 4 | 5,
): Record<string, number> {
  const responses: Record<string, number> = {};
  for (const id of listAlivenessStatementIds()) {
    responses[id] = rating;
  }
  return responses;
}

/** Set one domain to a uniform rating; others to a different baseline. */
export function fillDomainHighlight(input: {
  highDomain: AlivenessDomainId;
  highRating: 1 | 2 | 3 | 4 | 5;
  lowDomain: AlivenessDomainId;
  lowRating: 1 | 2 | 3 | 4 | 5;
  otherRating?: 1 | 2 | 3 | 4 | 5;
}): Record<string, number> {
  const other = input.otherRating ?? 3;
  const responses: Record<string, number> = {};
  for (const domain of alivenessIndexDomains) {
    const rating =
      domain.id === input.highDomain
        ? input.highRating
        : domain.id === input.lowDomain
          ? input.lowRating
          : other;
    for (const statement of domain.statements) {
      responses[statement.id] = rating;
    }
  }
  return responses;
}

export const SCORING_FIXTURES = {
  allFives: {
    responses: fillAllRatings(5),
    expectedTotal: 225,
    expectedEachDomain: 25,
  },
  allOnes: {
    responses: fillAllRatings(1),
    expectedTotal: 45,
    expectedEachDomain: 5,
  },
  purposeHighStewardshipLow: {
    responses: fillDomainHighlight({
      highDomain: "purpose",
      highRating: 5,
      lowDomain: "stewardship",
      lowRating: 1,
      otherRating: 3,
    }),
    expectedHighest: ["purpose"] as AlivenessDomainId[],
    expectedLowest: ["stewardship"] as AlivenessDomainId[],
    // 25 + 7*15 + 5 = 25 + 105 + 5 = 135
    expectedTotal: 135,
  },
  /** Tie on highest: purpose + health both 25; lowest stewardship 5. */
  tiedHighest: {
    responses: (() => {
      const responses = fillAllRatings(3);
      for (const domain of alivenessIndexDomains) {
        if (domain.id === "purpose" || domain.id === "health") {
          for (const statement of domain.statements) {
            responses[statement.id] = 5;
          }
        }
        if (domain.id === "stewardship") {
          for (const statement of domain.statements) {
            responses[statement.id] = 1;
          }
        }
      }
      return responses;
    })(),
    expectedHighest: ["purpose", "health"] as AlivenessDomainId[],
    expectedLowest: ["stewardship"] as AlivenessDomainId[],
  },
  /** Incomplete — missing last statement. */
  incomplete: {
    responses: (() => {
      const responses = fillAllRatings(4);
      delete responses["stewardship-5"];
      return responses;
    })(),
  },
} as const;

export function assertFixtureScores() {
  const allFive = computeAlivenessResults(SCORING_FIXTURES.allFives.responses);
  if (
    !allFive.complete ||
    allFive.total !== 225 ||
    allFive.domainScores.some((d) => d.score !== 25)
  ) {
    throw new Error("allFives fixture failed");
  }

  const allOne = computeAlivenessResults(SCORING_FIXTURES.allOnes.responses);
  if (!allOne.complete || allOne.total !== 45) {
    throw new Error("allOnes fixture failed");
  }

  const contrast = computeAlivenessResults(
    SCORING_FIXTURES.purposeHighStewardshipLow.responses,
  );
  if (
    contrast.total !== 135 ||
    contrast.highestDomains.join(",") !== "purpose" ||
    contrast.lowestDomains.join(",") !== "stewardship"
  ) {
    throw new Error("purposeHighStewardshipLow fixture failed");
  }

  const tied = computeAlivenessResults(SCORING_FIXTURES.tiedHighest.responses);
  if (tied.highestDomains.join(",") !== "purpose,health") {
    throw new Error("tiedHighest order/tie-break failed");
  }

  const incomplete = computeAlivenessResults(
    SCORING_FIXTURES.incomplete.responses,
  );
  if (incomplete.complete || incomplete.total !== 0) {
    throw new Error("incomplete fixture should not be complete");
  }
}
