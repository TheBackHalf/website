import type { AppRole } from "@/lib/auth/roles";
import type { Locale } from "@/lib/i18n/config";

export type AuthProvider = "email" | "google";

/** Launch-available Architect support contact surfaces only. */
export type SupportPreference = "support" | "contact";

export type UserRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash?: string;
  authProvider: AuthProvider;
  googleId?: string;
  arcCode: string;
  emailVerified: boolean;
  locale: Locale;
  /**
   * Authorization role. Defaults to architect for normal registrations.
   * Never accept this from client profile/registration payloads.
   */
  role: AppRole;
  /** Optional name pronunciation guidance for The Back Half. */
  pronunciation?: string;
  /** Preferred launch support channel. */
  supportPreference?: SupportPreference;
  /** IANA time zone identifier. */
  timeZone?: string;
  /**
   * Launch 18+ attestation. True only after eligible confirmation.
   * Missing/false means the account may not use participant experiences.
   * Date of birth is not stored.
   */
  ageEligible?: boolean;
  ageEligibleConfirmedAt?: string;
  /**
   * Set when a verified privacy-rights deletion has anonymized the account.
   * Login and Google Sign-In must treat this as a non-account.
   */
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type EmailVerificationToken = {
  token: string;
  userId: string;
  email: string;
  expiresAt: string;
  createdAt: string;
};

export type PasswordResetToken = {
  token: string;
  userId: string;
  email: string;
  expiresAt: string;
  createdAt: string;
  usedAt?: string;
};

export type LoginFormData = {
  email: string;
  password: string;
  locale: Locale;
};

export type LoginValidationErrors = Partial<Record<"email" | "password" | "form", string>>;

export type LoginEmailResult =
  | { status: "success"; redirectPath: string }
  | { status: "invalid_credentials" }
  | { status: "validation_error"; errors: LoginValidationErrors }
  | { status: "error"; message: string };

export type ForgotPasswordResult =
  | { status: "accepted" }
  | { status: "validation_error"; errors: Partial<Record<"email" | "form", string>> }
  | { status: "error"; message: string };

export type ResetPasswordResult =
  | { status: "success"; redirectPath: string }
  | { status: "invalid_token" }
  | { status: "expired_token" }
  | { status: "used_token" }
  | { status: "validation_error"; errors: Partial<Record<"password" | "passwordConfirm" | "form", string>> }
  | { status: "error"; message: string };

export type RegistrationFormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirm: string;
  locale: Locale;
};

export type RegistrationValidationErrors = Partial<
  Record<
    | keyof RegistrationFormData
    | "consent"
    | "form",
    string
  >
>;

export type RegisterEmailResult =
  | {
      status: "success";
      userId: string;
      requiresVerification: true;
    }
  | {
      status: "duplicate";
      field: "email";
    }
  | {
      status: "validation_error";
      errors: RegistrationValidationErrors;
    }
  | {
      status: "consent_required";
      errors: RegistrationValidationErrors;
    }
  | {
      status: "age_ineligible";
    }
  | {
      status: "error";
      message: string;
    };

export type VerifyEmailResult =
  | { status: "verified"; redirectPath: string }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "already_verified"; redirectPath: string };

export type ResendVerificationResult =
  | { status: "sent" }
  | { status: "not_found" }
  | { status: "already_verified" }
  | { status: "rate_limited" }
  | { status: "email_not_configured" };

export type GoogleRegistrationResult =
  | { status: "created"; userId: string; redirectPath: string }
  | { status: "existing"; redirectPath: string }
  | { status: "conflict"; message: string }
  | { status: "consent_required" }
  | { status: "age_ineligible" }
  | { status: "cancelled" }
  | { status: "not_configured" };

export type SessionPayload = {
  sub: string;
  email: string;
  arcCode: string;
  emailVerified: boolean;
  locale: Locale;
  role: AppRole;
  ageEligible: boolean;
  iat: number;
  exp: number;
};
