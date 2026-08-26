/**
 * Row 60 — Founder-approved launch eligibility.
 * Platform participation is 18+. Brand philosophy is unchanged.
 * Do not collect date of birth. Do not implement COPPA, minor, teen,
 * parent/guardian, or parental-authorization workflows.
 */

export const MINIMUM_PARTICIPANT_AGE = 18;
export const LAUNCH_ELIGIBILITY_DECISION = "18+ ONLY" as const;
export const FOUNDER_AGE_DECISION = "APPROVED" as const;

export const AGE_ELIGIBILITY_COOKIE = "bh-age-eligibility";
export const AGE_ELIGIBILITY_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type AgeEligibilityStatus = "eligible" | "ineligible" | "unconfirmed";
export type AgeEligibilityDecision = "eligible" | "ineligible";

export type AgeEligibilityClaim =
  | { kind: "attestation"; attestedAdult: boolean }
  | { kind: "age_years"; ageYears: number };

export function evaluateAgeEligibility(
  claim: AgeEligibilityClaim,
): AgeEligibilityDecision {
  if (claim.kind === "age_years") {
    const age = claim.ageYears;
    if (!Number.isInteger(age) || age < 0 || age > 120) {
      return "ineligible";
    }
    return age >= MINIMUM_PARTICIPANT_AGE ? "eligible" : "ineligible";
  }

  return claim.attestedAdult === true ? "eligible" : "ineligible";
}

export function parseAgeEligibilityClaim(
  input: unknown,
): AgeEligibilityClaim | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const body = input as {
    ageYears?: unknown;
    attestedAdult?: unknown;
  };

  if (typeof body.ageYears === "number") {
    return { kind: "age_years", ageYears: body.ageYears };
  }

  if (typeof body.ageYears === "string" && body.ageYears.trim() !== "") {
    const parsed = Number(body.ageYears);
    if (Number.isFinite(parsed)) {
      return { kind: "age_years", ageYears: parsed };
    }
  }

  if (typeof body.attestedAdult === "boolean") {
    return { kind: "attestation", attestedAdult: body.attestedAdult };
  }

  if (body.attestedAdult === "true" || body.attestedAdult === "yes") {
    return { kind: "attestation", attestedAdult: true };
  }

  if (body.attestedAdult === "false" || body.attestedAdult === "no") {
    return { kind: "attestation", attestedAdult: false };
  }

  return null;
}

export function accountIsAgeEligible(user: {
  ageEligible?: boolean;
} | null | undefined): boolean {
  return user?.ageEligible === true;
}

export function getAgeEligibilityCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: AGE_ELIGIBILITY_MAX_AGE_SECONDS,
  };
}
