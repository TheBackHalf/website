import { readFileSync } from "node:fs";
import { normalizeEmail } from "@/lib/auth/normalize-email";

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

const DEFAULT_HOLDS_PATH = "ops/fab-5/privacy-legal-holds.json";

export function loadPrivacyLegalHolds(): PrivacyLegalHold[] {
  const holdsPath = process.env.PRIVACY_LEGAL_HOLDS_FILE || DEFAULT_HOLDS_PATH;
  try {
    const raw = readFileSync(holdsPath, "utf8");
    const parsed = JSON.parse(raw) as HoldsFile;
    return Array.isArray(parsed.holds) ? parsed.holds : [];
  } catch {
    return [];
  }
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
