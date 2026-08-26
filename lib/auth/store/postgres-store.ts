import type { ConsentRecord } from "@/lib/consent/types";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import {
  DEFAULT_APP_ROLE,
  getConfiguredRoleForEmail,
  isAssignableHumanRole,
  normalizeAppRole,
} from "@/lib/auth/roles";
import {
  AuthPersistenceError,
  ensureAuthSchema,
  getAuthSql,
  isDuplicateEmailConstraint,
} from "@/lib/auth/store/db";
import type { AuthStore, CreateUserInput } from "@/lib/auth/store/types";
import type {
  EmailVerificationToken,
  PasswordResetToken,
  SupportPreference,
  UserRecord,
} from "@/lib/auth/types";
import type { Sql, TransactionSql } from "postgres";

type SqlClient = Sql | TransactionSql;

type UserRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  password_hash: string | null;
  auth_provider: UserRecord["authProvider"];
  google_id: string | null;
  arc_code: string;
  email_verified: boolean;
  locale: UserRecord["locale"];
  role: string;
  pronunciation: string | null;
  support_preference: string | null;
  time_zone: string | null;
  age_eligible: boolean | null;
  age_eligible_confirmed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ConsentRow = {
  id: string;
  user_id: string;
  consent_type: ConsentRecord["consentType"];
  document_id: string;
  document_version: string | null;
  document_effective_date: string | null;
  publication_status: ConsentRecord["publicationStatus"] | null;
  consented_at: Date | string;
  session_id: string | null;
  locale: string | null;
};

type VerificationRow = {
  token: string;
  user_id: string;
  email: string;
  expires_at: Date | string;
  created_at: Date | string;
};

type ResetRow = {
  token: string;
  user_id: string;
  email: string;
  expires_at: Date | string;
  created_at: Date | string;
  used_at: Date | string | null;
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function optionalIso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  return iso(value);
}

function isSupportPreference(value: unknown): value is SupportPreference {
  return value === "support" || value === "contact";
}

function fromUserRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    passwordHash: row.password_hash ?? undefined,
    authProvider: row.auth_provider === "google" ? "google" : "email",
    googleId: row.google_id ?? undefined,
    arcCode: row.arc_code,
    emailVerified: row.email_verified === true,
    locale: row.locale === "es" ? "es" : "en",
    role: normalizeAppRole(row.role),
    pronunciation: row.pronunciation ?? undefined,
    supportPreference: isSupportPreference(row.support_preference)
      ? row.support_preference
      : undefined,
    timeZone: row.time_zone ?? undefined,
    ageEligible: row.age_eligible === true ? true : row.age_eligible === false ? false : undefined,
    ageEligibleConfirmedAt: optionalIso(row.age_eligible_confirmed_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function fromConsentRow(row: ConsentRow): ConsentRecord {
  return {
    consentType: row.consent_type,
    documentId: row.document_id,
    documentVersion: row.document_version ?? undefined,
    documentEffectiveDate: row.document_effective_date ?? undefined,
    publicationStatus: row.publication_status ?? undefined,
    consentedAt: iso(row.consented_at),
    userId: row.user_id,
    sessionId: row.session_id ?? undefined,
    locale: row.locale ?? undefined,
  };
}

function requireSql(): Sql {
  const sql = getAuthSql();
  if (!sql) {
    throw new AuthPersistenceError("auth_postgres_unconfigured");
  }
  return sql;
}

function buildUser(input: CreateUserInput): UserRecord {
  const timestamp = new Date().toISOString();
  const normalized = normalizeEmail(input.email);
  return {
    id: crypto.randomUUID(),
    email: normalized,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    passwordHash: input.passwordHash,
    authProvider: input.authProvider,
    googleId: input.googleId,
    arcCode: input.arcCode,
    emailVerified: input.emailVerified,
    locale: input.locale,
    role: getConfiguredRoleForEmail(normalized) ?? DEFAULT_APP_ROLE,
    ageEligible: input.ageEligible === true ? true : undefined,
    ageEligibleConfirmedAt: input.ageEligibleConfirmedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function insertUser(sql: SqlClient, user: UserRecord): Promise<void> {
  try {
    await sql`
      INSERT INTO bh_auth_users (
        id, email, first_name, last_name, password_hash, auth_provider, google_id,
        arc_code, email_verified, locale, role, pronunciation, support_preference,
        time_zone, age_eligible, age_eligible_confirmed_at, created_at, updated_at
      ) VALUES (
        ${user.id},
        ${user.email},
        ${user.firstName},
        ${user.lastName},
        ${user.passwordHash ?? null},
        ${user.authProvider},
        ${user.googleId ?? null},
        ${user.arcCode},
        ${user.emailVerified},
        ${user.locale},
        ${user.role},
        ${user.pronunciation ?? null},
        ${user.supportPreference ?? null},
        ${user.timeZone ?? null},
        ${user.ageEligible === true ? true : user.ageEligible === false ? false : null},
        ${user.ageEligibleConfirmedAt ?? null},
        ${user.createdAt},
        ${user.updatedAt}
      )
    `;
  } catch (error) {
    if (isDuplicateEmailConstraint(error)) {
      throw new Error("DUPLICATE_EMAIL");
    }
    throw error;
  }
}

async function insertConsents(
  sql: SqlClient,
  records: ConsentRecord[],
): Promise<void> {
  for (const record of records) {
    if (!record.userId) continue;
    await sql`
      INSERT INTO bh_auth_consents (
        id, user_id, consent_type, document_id, document_version,
        document_effective_date, publication_status, consented_at, session_id, locale
      ) VALUES (
        ${crypto.randomUUID()},
        ${record.userId},
        ${record.consentType},
        ${record.documentId},
        ${record.documentVersion ?? null},
        ${record.documentEffectiveDate ?? null},
        ${record.publicationStatus ?? null},
        ${record.consentedAt},
        ${record.sessionId ?? null},
        ${record.locale ?? null}
      )
    `;
  }
}

async function replaceVerificationToken(
  sql: SqlClient,
  token: EmailVerificationToken,
): Promise<void> {
  await sql`DELETE FROM bh_auth_verification_tokens WHERE user_id = ${token.userId}`;
  await sql`
    INSERT INTO bh_auth_verification_tokens (token, user_id, email, expires_at, created_at)
    VALUES (${token.token}, ${token.userId}, ${token.email}, ${token.expiresAt}, ${token.createdAt})
  `;
}

export function createPostgresAuthStore(): AuthStore {
  return {
    async findUserByEmail(email) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      const rows = await sql<UserRow[]>`
        SELECT * FROM bh_auth_users WHERE email = ${normalizeEmail(email)} LIMIT 1
      `;
      return rows[0] ? fromUserRow(rows[0]) : undefined;
    },

    async findUserById(id) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      const rows = await sql<UserRow[]>`
        SELECT * FROM bh_auth_users WHERE id = ${id} LIMIT 1
      `;
      return rows[0] ? fromUserRow(rows[0]) : undefined;
    },

    async findUserByGoogleId(googleId) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      const rows = await sql<UserRow[]>`
        SELECT * FROM bh_auth_users WHERE google_id = ${googleId} LIMIT 1
      `;
      return rows[0] ? fromUserRow(rows[0]) : undefined;
    },

    async findUserByArcCode(arcCode) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      const rows = await sql<UserRow[]>`
        SELECT * FROM bh_auth_users WHERE arc_code = ${arcCode} LIMIT 1
      `;
      return rows[0] ? fromUserRow(rows[0]) : undefined;
    },

    async listUsers() {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      const rows = await sql<UserRow[]>`
        SELECT * FROM bh_auth_users ORDER BY created_at ASC
      `;
      return rows.map(fromUserRow);
    },

    async isArcCodeTaken(arcCode) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      const rows = await sql<{ n: number }[]>`
        SELECT COUNT(*)::int AS n FROM bh_auth_users WHERE arc_code = ${arcCode}
      `;
      return (rows[0]?.n ?? 0) > 0;
    },

    async createUser(input) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      const existing = await sql<UserRow[]>`
        SELECT * FROM bh_auth_users WHERE email = ${normalizeEmail(input.email)} LIMIT 1
      `;
      if (existing[0]) {
        throw new Error("DUPLICATE_EMAIL");
      }
      const user = buildUser(input);
      await insertUser(sql, user);
      return user;
    },

    async persistEmailRegistration(input) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      return sql.begin(async (tx) => {
        const existing = await tx<UserRow[]>`
          SELECT id FROM bh_auth_users WHERE email = ${normalizeEmail(input.user.email)} LIMIT 1
        `;
        if (existing[0]) {
          throw new Error("DUPLICATE_EMAIL");
        }
        const user = buildUser(input.user);
        await insertUser(tx, user);
        const consents = input.consents.map((record) => ({ ...record, userId: user.id }));
        await insertConsents(tx, consents);
        await replaceVerificationToken(tx, {
          ...input.verificationToken,
          userId: user.id,
          email: user.email,
        });
        return user;
      });
    },

    async updateUser(id, patch) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      const currentRows = await sql<UserRow[]>`
        SELECT * FROM bh_auth_users WHERE id = ${id} LIMIT 1
      `;
      const current = currentRows[0] ? fromUserRow(currentRows[0]) : undefined;
      if (!current) return undefined;

      const { role: _ignoredRole, ...safePatch } = patch as typeof patch & {
        role?: unknown;
      };
      void _ignoredRole;

      const updated: UserRecord = {
        ...current,
        ...safePatch,
        role: current.role,
        updatedAt: new Date().toISOString(),
      };

      await sql`
        UPDATE bh_auth_users SET
          first_name = ${updated.firstName},
          last_name = ${updated.lastName},
          password_hash = ${updated.passwordHash ?? null},
          email_verified = ${updated.emailVerified},
          locale = ${updated.locale},
          pronunciation = ${updated.pronunciation ?? null},
          support_preference = ${updated.supportPreference ?? null},
          time_zone = ${updated.timeZone ?? null},
          age_eligible = ${updated.ageEligible === true ? true : updated.ageEligible === false ? false : null},
          age_eligible_confirmed_at = ${updated.ageEligibleConfirmedAt ?? null},
          updated_at = ${updated.updatedAt}
        WHERE id = ${id}
      `;
      return updated;
    },

    async setUserRole(id, role) {
      if (!isAssignableHumanRole(role)) {
        return undefined;
      }
      const sql = requireSql();
      await ensureAuthSchema(sql);
      const rows = await sql<UserRow[]>`
        UPDATE bh_auth_users
        SET role = ${role}, updated_at = ${new Date().toISOString()}
        WHERE id = ${id}
        RETURNING *
      `;
      return rows[0] ? fromUserRow(rows[0]) : undefined;
    },

    async recordConsents(records) {
      const persistable = records.filter((record) => record.userId);
      if (persistable.length === 0) return;
      const sql = requireSql();
      await ensureAuthSchema(sql);
      await insertConsents(sql, persistable);
    },

    async findConsentRecordsByUserId(userId) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      const rows = await sql<ConsentRow[]>`
        SELECT * FROM bh_auth_consents
        WHERE user_id = ${userId}
        ORDER BY consented_at DESC
      `;
      return rows.map(fromConsentRow);
    },

    async createVerificationToken(token) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      await replaceVerificationToken(sql, token);
      return token;
    },

    async findVerificationToken(token) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      const rows = await sql<VerificationRow[]>`
        SELECT * FROM bh_auth_verification_tokens WHERE token = ${token} LIMIT 1
      `;
      const row = rows[0];
      if (!row) return undefined;
      return {
        token: row.token,
        userId: row.user_id,
        email: row.email,
        expiresAt: iso(row.expires_at),
        createdAt: iso(row.created_at),
      };
    },

    async deleteVerificationToken(token) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      await sql`DELETE FROM bh_auth_verification_tokens WHERE token = ${token}`;
    },

    async deleteVerificationTokensForUser(userId) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      await sql`DELETE FROM bh_auth_verification_tokens WHERE user_id = ${userId}`;
    },

    async createPasswordResetToken(token) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      await sql`DELETE FROM bh_auth_password_reset_tokens WHERE user_id = ${token.userId}`;
      await sql`
        INSERT INTO bh_auth_password_reset_tokens (
          token, user_id, email, expires_at, created_at, used_at
        ) VALUES (
          ${token.token}, ${token.userId}, ${token.email}, ${token.expiresAt},
          ${token.createdAt}, ${token.usedAt ?? null}
        )
      `;
      return token;
    },

    async findPasswordResetToken(token) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      const rows = await sql<ResetRow[]>`
        SELECT * FROM bh_auth_password_reset_tokens WHERE token = ${token} LIMIT 1
      `;
      const row = rows[0];
      if (!row) return undefined;
      return {
        token: row.token,
        userId: row.user_id,
        email: row.email,
        expiresAt: iso(row.expires_at),
        createdAt: iso(row.created_at),
        usedAt: optionalIso(row.used_at),
      };
    },

    async markPasswordResetTokenUsed(token) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      await sql`
        UPDATE bh_auth_password_reset_tokens
        SET used_at = ${new Date().toISOString()}
        WHERE token = ${token}
      `;
    },

    async deletePasswordResetToken(token) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      await sql`DELETE FROM bh_auth_password_reset_tokens WHERE token = ${token}`;
    },

    async deletePasswordResetTokensForUser(userId) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      await sql`DELETE FROM bh_auth_password_reset_tokens WHERE user_id = ${userId}`;
    },

    async getLastResendAt(email) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      const rows = await sql<{ last_resend_at: Date | string }[]>`
        SELECT last_resend_at FROM bh_auth_resend_timestamps
        WHERE email = ${normalizeEmail(email)}
        LIMIT 1
      `;
      return rows[0] ? iso(rows[0].last_resend_at) : undefined;
    },

    async setLastResendAt(email, timestamp) {
      const sql = requireSql();
      await ensureAuthSchema(sql);
      await sql`
        INSERT INTO bh_auth_resend_timestamps (email, last_resend_at)
        VALUES (${normalizeEmail(email)}, ${timestamp})
        ON CONFLICT (email) DO UPDATE SET last_resend_at = EXCLUDED.last_resend_at
      `;
    },
  };
}

export function createUnconfiguredProductionAuthStore(): AuthStore {
  const reject = () =>
    Promise.reject(new AuthPersistenceError("auth_postgres_unconfigured"));
  return {
    findUserByEmail: reject,
    findUserById: reject,
    findUserByGoogleId: reject,
    findUserByArcCode: reject,
    listUsers: reject,
    isArcCodeTaken: reject,
    createUser: reject,
    persistEmailRegistration: reject,
    updateUser: reject,
    setUserRole: reject,
    recordConsents: reject,
    findConsentRecordsByUserId: reject,
    createVerificationToken: reject,
    findVerificationToken: reject,
    deleteVerificationToken: reject,
    deleteVerificationTokensForUser: reject,
    createPasswordResetToken: reject,
    findPasswordResetToken: reject,
    markPasswordResetTokenUsed: reject,
    deletePasswordResetToken: reject,
    deletePasswordResetTokensForUser: reject,
    getLastResendAt: reject,
    setLastResendAt: reject,
  };
}
