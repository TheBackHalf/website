import type { ConsentRecord } from "@/lib/consent/types";
import type { AssignableHumanRole } from "@/lib/auth/roles";
import type {
  EmailVerificationToken,
  PasswordResetToken,
  UserRecord,
} from "@/lib/auth/types";

export type AuthDatabase = {
  users: UserRecord[];
  consentRecords: ConsentRecord[];
  verificationTokens: EmailVerificationToken[];
  passwordResetTokens: PasswordResetToken[];
  resendTimestamps: Record<string, string>;
};

export type CreateUserInput = {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash?: string;
  authProvider: UserRecord["authProvider"];
  googleId?: string;
  arcCode: string;
  emailVerified: boolean;
  locale: UserRecord["locale"];
  /** Optional; store defaults to architect and ignores privileged client values. */
  role?: UserRecord["role"];
  ageEligible?: boolean;
  ageEligibleConfirmedAt?: string;
};

export type AuthStore = {
  findUserByEmail(email: string): Promise<UserRecord | undefined>;
  findUserById(id: string): Promise<UserRecord | undefined>;
  findUserByGoogleId(googleId: string): Promise<UserRecord | undefined>;
  findUserByArcCode(arcCode: string): Promise<UserRecord | undefined>;
  listUsers(): Promise<UserRecord[]>;
  isArcCodeTaken(arcCode: string): Promise<boolean>;
  createUser(input: CreateUserInput): Promise<UserRecord>;
  /**
   * Atomically persist a new email account, required consents, and the
   * verification token so a later step cannot leave a partial user.
   */
  persistEmailRegistration(input: {
    user: CreateUserInput;
    consents: ConsentRecord[];
    verificationToken: EmailVerificationToken;
  }): Promise<UserRecord>;
  updateUser(
    id: string,
    patch: Partial<
      Pick<
        UserRecord,
        | "emailVerified"
        | "firstName"
        | "lastName"
        | "locale"
        | "passwordHash"
        | "pronunciation"
        | "supportPreference"
        | "timeZone"
        | "ageEligible"
        | "ageEligibleConfirmedAt"
      >
    >,
  ): Promise<UserRecord | undefined>;
  /**
   * Trusted role mutation path. Never called from profile/registration clients.
   * Cannot assign system through this method.
   */
  setUserRole(
    id: string,
    role: AssignableHumanRole,
  ): Promise<UserRecord | undefined>;
  recordConsents(records: ConsentRecord[]): Promise<void>;
  findConsentRecordsByUserId(userId: string): Promise<ConsentRecord[]>;
  createVerificationToken(
    token: EmailVerificationToken,
  ): Promise<EmailVerificationToken>;
  findVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  deleteVerificationToken(token: string): Promise<void>;
  deleteVerificationTokensForUser(userId: string): Promise<void>;
  createPasswordResetToken(
    token: PasswordResetToken,
  ): Promise<PasswordResetToken>;
  findPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  deletePasswordResetToken(token: string): Promise<void>;
  deletePasswordResetTokensForUser(userId: string): Promise<void>;
  getLastResendAt(email: string): Promise<string | undefined>;
  setLastResendAt(email: string, timestamp: string): Promise<void>;
};