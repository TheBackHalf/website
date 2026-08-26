import type { ConsentRecord } from "@/lib/consent/types";
import { normalizeAppRole, type AppRole } from "@/lib/auth/roles";
import type {
  AuthProvider,
  SupportPreference,
  UserRecord,
} from "@/lib/auth/types";
import type { Locale } from "@/lib/i18n/config";

export const SUPPORT_PREFERENCE_OPTIONS = ["support", "contact"] as const;

export type ArchitectProfileView = {
  email: string;
  firstName: string;
  lastName: string;
  pronunciation: string;
  locale: Locale;
  supportPreference: SupportPreference | "";
  timeZone: string;
  authProvider: AuthProvider;
  hasPassword: boolean;
  googleLinked: boolean;
  arcCode: string;
  emailVerified: boolean;
  /** Read-only authorization label — never editable via profile form. */
  role: AppRole;
};

export type ConsentHistoryItem = {
  consentType: ConsentRecord["consentType"];
  documentId: string;
  accepted: true;
  consentedAt: string;
  documentVersion: string | null;
};

export type ProfileFormData = {
  firstName: string;
  lastName: string;
  pronunciation: string;
  locale: Locale;
  supportPreference: SupportPreference | "";
  timeZone: string;
};

export type ProfileValidationErrors = Partial<
  Record<
    | "firstName"
    | "lastName"
    | "pronunciation"
    | "locale"
    | "supportPreference"
    | "timeZone"
    | "form",
    string
  >
>;

export type UpdateProfileResult =
  | { status: "success"; redirectPath?: string; profile: ArchitectProfileView }
  | { status: "validation_error"; errors: ProfileValidationErrors }
  | { status: "unauthorized" }
  | { status: "error"; message: string };

export function toArchitectProfileView(user: UserRecord): ArchitectProfileView {
  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    pronunciation: user.pronunciation ?? "",
    locale: user.locale,
    supportPreference: user.supportPreference ?? "",
    timeZone: user.timeZone ?? "",
    authProvider: user.authProvider,
    hasPassword: Boolean(user.passwordHash),
    googleLinked: Boolean(user.googleId) || user.authProvider === "google",
    arcCode: user.arcCode,
    emailVerified: user.emailVerified,
    role: normalizeAppRole(user.role),
  };
}

export function toConsentHistoryItems(
  records: ConsentRecord[],
): ConsentHistoryItem[] {
  return records.map((record) => ({
    consentType: record.consentType,
    documentId: record.documentId,
    accepted: true as const,
    consentedAt: record.consentedAt,
    documentVersion: record.documentVersion?.trim()
      ? record.documentVersion
      : null,
  }));
}

export function isSupportPreference(
  value: string,
): value is SupportPreference {
  return (SUPPORT_PREFERENCE_OPTIONS as readonly string[]).includes(value);
}
