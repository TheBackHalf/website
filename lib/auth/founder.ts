import { normalizeEmail } from "@/lib/auth/normalize-email";

const DEFAULT_FOUNDER_HUMAN_EMAIL = "kimberly@thebackhalf.org";

/**
 * Kimberly Walker (human) is the sole Founder acceptance authority.
 * Kimberly Walker (AI) is not an operating agent and must not approve.
 */
export function getFounderHumanEmails(): Set<string> {
  const raw =
    process.env.BH_FOUNDER_EMAIL?.trim() ||
    process.env.FOUNDER_NOTIFY_EMAIL?.trim() ||
    DEFAULT_FOUNDER_HUMAN_EMAIL;
  return new Set(
    raw
      .split(",")
      .map((entry) => normalizeEmail(entry))
      .filter(Boolean),
  );
}

export function isFounderHumanEmail(email: string | undefined | null): boolean {
  if (!email?.trim()) return false;
  return getFounderHumanEmails().has(normalizeEmail(email));
}
