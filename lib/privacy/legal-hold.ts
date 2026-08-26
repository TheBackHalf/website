import { readFileSync } from "node:fs";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import defaultHolds from "@/ops/fab-5/privacy-legal-holds.json";

export type PrivacyLegalHold = {
  id: string;
  userId?: string;
  email?: string;
  reason?: string;
  active?: boolean;
};

type HoldsFile = {
  holds?: PrivacyLegalHold[];
};

function holdsFromUnknown(raw: HoldsFile | undefined): PrivacyLegalHold[] {
  return Array.isArray(raw?.holds) ? raw.holds : [];
}

export function loadPrivacyLegalHolds(): PrivacyLegalHold[] {
  const override = process.env.PRIVACY_LEGAL_HOLDS_FILE;
  if (override) {
    try {
      const raw = readFileSync(/* turbopackIgnore: true */ override, "utf8");
      return holdsFromUnknown(JSON.parse(raw) as HoldsFile);
    } catch {
      return [];
    }
  }
  return holdsFromUnknown(defaultHolds as HoldsFile);
}

export function activeLegalHoldFor(input: {
  userId?: string;
  email?: string;
}): PrivacyLegalHold | undefined {
  const email = input.email ? normalizeEmail(input.email) : "";
  const userId = input.userId?.trim() ?? "";
  return loadPrivacyLegalHolds().find((hold) => {
    if (hold.active === false) return false;
    if (userId && hold.userId === userId) return true;
    if (email && hold.email && normalizeEmail(hold.email) === email) return true;
    return false;
  });
}
