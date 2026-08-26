/**
 * Durable Stripe projection (not a second ledger).
 * Stripe remains the system of record for charges, subscriptions, and refunds.
 * These tables exist so entitlements and webhook idempotency survive serverless.
 * Postgres restore of these rows is a cache/projection restore, not a Stripe restore.
 */

import {
  DurablePersistenceError,
} from "@/lib/durable/db";
import { ensureDurableSchema } from "@/lib/durable/schema";
import type {
  AccountAccessRecord,
  BillingNotificationRecord,
  EntitlementKind,
  EntitlementRecord,
  PurchaseRecord,
  StripeEventLogRecord,
} from "@/lib/billing/types";
import type { BillingStore } from "@/lib/billing/store";

function mergeEndsAt(
  current: EntitlementRecord,
  incoming: Omit<EntitlementRecord, "id" | "updatedAt"> & { id?: string },
): string | undefined {
  if (!incoming.endsAt) return current.endsAt;
  if (incoming.sourceOfferId === "bundle" && current.sourceOfferId === "bundle") {
    if (current.endsAt && incoming.endsAt) {
      return current.endsAt < incoming.endsAt ? current.endsAt : incoming.endsAt;
    }
    return current.endsAt ?? incoming.endsAt;
  }
  if (
    incoming.stripeSubscriptionId &&
    current.stripeSubscriptionId === incoming.stripeSubscriptionId
  ) {
    if (current.endsAt && incoming.endsAt) {
      return current.endsAt > incoming.endsAt ? current.endsAt : incoming.endsAt;
    }
  }
  return incoming.endsAt;
}

type EntitlementRow = {
  id: string;
  user_id: string;
  kind: EntitlementKind;
  stripe_subscription_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  payload: EntitlementRecord;
};

type PurchaseRow = {
  id: string;
  user_id: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  stripe_charge_id: string | null;
  payload: PurchaseRecord;
};

export function createPostgresBillingStore(): BillingStore {
  return {
    async findStripeEvent(eventId) {
      const sql = await ensureDurableSchema();
      const rows = await sql<{ payload: StripeEventLogRecord }[]>`
        SELECT payload FROM bh_billing_stripe_events WHERE id = ${eventId} LIMIT 1
      `;
      return rows[0]?.payload;
    },

    async deleteStripeEvent(eventId) {
      const sql = await ensureDurableSchema();
      const rows = await sql<{ id: string }[]>`
        DELETE FROM bh_billing_stripe_events WHERE id = ${eventId} RETURNING id
      `;
      return rows.length > 0;
    },

    async recordStripeEvent(record) {
      const sql = await ensureDurableSchema();
      const inserted = await sql<{ id: string }[]>`
        INSERT INTO bh_billing_stripe_events (id, payload, processed_at)
        VALUES (${record.id}, ${sql.json(record as never)}, ${record.processedAt})
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `;
      return inserted[0] ? "created" : "duplicate";
    },

    async upsertEntitlement(input) {
      const sql = await ensureDurableSchema();
      const now = new Date().toISOString();
      const candidates = await sql<EntitlementRow[]>`
        SELECT * FROM bh_billing_entitlements WHERE user_id = ${input.userId}
      `;
      const existing = candidates.find((row) => {
        const entry = row.payload;
        if (input.id && entry.id === input.id) return true;
        if (
          input.stripeSubscriptionId &&
          entry.stripeSubscriptionId === input.stripeSubscriptionId &&
          entry.kind === input.kind
        ) {
          return true;
        }
        if (
          input.stripeCheckoutSessionId &&
          entry.stripeCheckoutSessionId === input.stripeCheckoutSessionId &&
          entry.kind === input.kind
        ) {
          return true;
        }
        return entry.userId === input.userId && entry.kind === input.kind;
      });

      if (existing) {
        const current = existing.payload;
        const updated: EntitlementRecord = {
          ...current,
          ...input,
          id: current.id,
          grantedAt: current.grantedAt,
          startsAt: current.startsAt,
          endsAt: input.endsAt !== undefined ? mergeEndsAt(current, input) : current.endsAt,
          updatedAt: now,
        };
        await sql`
          UPDATE bh_billing_entitlements SET
            kind = ${updated.kind},
            stripe_subscription_id = ${updated.stripeSubscriptionId ?? null},
            stripe_checkout_session_id = ${updated.stripeCheckoutSessionId ?? null},
            stripe_payment_intent_id = ${updated.stripePaymentIntentId ?? null},
            payload = ${sql.json(updated as never)},
            updated_at = ${now}
          WHERE id = ${updated.id}
        `;
        return updated;
      }

      const created: EntitlementRecord = {
        ...input,
        id: input.id ?? crypto.randomUUID(),
        updatedAt: now,
      };
      await sql`
        INSERT INTO bh_billing_entitlements (
          id, user_id, kind, stripe_subscription_id, stripe_checkout_session_id,
          stripe_payment_intent_id, payload, updated_at
        ) VALUES (
          ${created.id},
          ${created.userId},
          ${created.kind},
          ${created.stripeSubscriptionId ?? null},
          ${created.stripeCheckoutSessionId ?? null},
          ${created.stripePaymentIntentId ?? null},
          ${sql.json(created as never)},
          ${now}
        )
      `;
      return created;
    },

    async findEntitlementsByUserId(userId) {
      const sql = await ensureDurableSchema();
      const rows = await sql<EntitlementRow[]>`
        SELECT payload FROM bh_billing_entitlements WHERE user_id = ${userId}
      `;
      return rows.map((row) => row.payload);
    },

    async findEntitlementByUserAndKind(userId, kind) {
      const sql = await ensureDurableSchema();
      const rows = await sql<EntitlementRow[]>`
        SELECT payload FROM bh_billing_entitlements
        WHERE user_id = ${userId} AND kind = ${kind}
        LIMIT 1
      `;
      return rows[0]?.payload;
    },

    async findEntitlementsBySubscriptionId(subscriptionId) {
      const sql = await ensureDurableSchema();
      const rows = await sql<EntitlementRow[]>`
        SELECT payload FROM bh_billing_entitlements
        WHERE stripe_subscription_id = ${subscriptionId}
      `;
      return rows.map((row) => row.payload);
    },

    async findEntitlementsByCheckoutSessionId(sessionId) {
      const sql = await ensureDurableSchema();
      const rows = await sql<EntitlementRow[]>`
        SELECT payload FROM bh_billing_entitlements
        WHERE stripe_checkout_session_id = ${sessionId}
      `;
      return rows.map((row) => row.payload);
    },

    async findEntitlementsByPaymentIntentId(paymentIntentId) {
      const sql = await ensureDurableSchema();
      const rows = await sql<EntitlementRow[]>`
        SELECT payload FROM bh_billing_entitlements
        WHERE stripe_payment_intent_id = ${paymentIntentId}
      `;
      return rows.map((row) => row.payload);
    },

    async upsertPurchase(input) {
      const sql = await ensureDurableSchema();
      const now = new Date().toISOString();
      const rows = await sql<PurchaseRow[]>`
        SELECT * FROM bh_billing_purchases
        WHERE
          (${input.id ?? null}::text IS NOT NULL AND id = ${input.id ?? ""})
          OR (${input.stripeCheckoutSessionId ?? null}::text IS NOT NULL
              AND stripe_checkout_session_id = ${input.stripeCheckoutSessionId ?? ""})
          OR (${input.stripePaymentIntentId ?? null}::text IS NOT NULL
              AND stripe_payment_intent_id = ${input.stripePaymentIntentId ?? ""})
          OR (${input.stripeInvoiceId ?? null}::text IS NOT NULL
              AND stripe_invoice_id = ${input.stripeInvoiceId ?? ""})
        LIMIT 1
      `;
      const existing = rows[0];
      const record: PurchaseRecord = existing
        ? {
            ...existing.payload,
            ...input,
            id: existing.id,
            createdAt: existing.payload.createdAt,
            updatedAt: now,
          }
        : {
            ...input,
            id: input.id ?? crypto.randomUUID(),
            updatedAt: now,
          };
      await sql`
        INSERT INTO bh_billing_purchases (
          id, user_id, stripe_checkout_session_id, stripe_payment_intent_id,
          stripe_invoice_id, stripe_charge_id, payload, updated_at
        ) VALUES (
          ${record.id},
          ${record.userId},
          ${record.stripeCheckoutSessionId ?? null},
          ${record.stripePaymentIntentId ?? null},
          ${record.stripeInvoiceId ?? null},
          ${record.stripeChargeId ?? null},
          ${sql.json(record as never)},
          ${now}
        )
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          stripe_checkout_session_id = EXCLUDED.stripe_checkout_session_id,
          stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
          stripe_invoice_id = EXCLUDED.stripe_invoice_id,
          stripe_charge_id = EXCLUDED.stripe_charge_id,
          payload = EXCLUDED.payload,
          updated_at = EXCLUDED.updated_at
      `;
      if (process.env.MARKETING_KPI_DB_FILE) {
        return record;
      }
      void import("@/lib/marketing-kpi/migrate")
        .then((mod) => mod.mirrorBillingPurchase(record))
        .catch(() => undefined);
      return record;
    },

    async findPurchasesByUserId(userId) {
      const sql = await ensureDurableSchema();
      const rows = await sql<PurchaseRow[]>`
        SELECT payload FROM bh_billing_purchases WHERE user_id = ${userId}
      `;
      return rows.map((row) => row.payload);
    },

    async findPurchaseByCheckoutSessionId(sessionId) {
      const sql = await ensureDurableSchema();
      const rows = await sql<PurchaseRow[]>`
        SELECT payload FROM bh_billing_purchases
        WHERE stripe_checkout_session_id = ${sessionId}
        LIMIT 1
      `;
      return rows[0]?.payload;
    },

    async findPurchaseByPaymentIntentId(paymentIntentId) {
      const sql = await ensureDurableSchema();
      const rows = await sql<PurchaseRow[]>`
        SELECT payload FROM bh_billing_purchases
        WHERE stripe_payment_intent_id = ${paymentIntentId}
        LIMIT 1
      `;
      return rows[0]?.payload;
    },

    async findPurchaseByChargeId(chargeId) {
      const sql = await ensureDurableSchema();
      const rows = await sql<PurchaseRow[]>`
        SELECT payload FROM bh_billing_purchases
        WHERE stripe_charge_id = ${chargeId}
        LIMIT 1
      `;
      return rows[0]?.payload;
    },

    async listPurchases() {
      const sql = await ensureDurableSchema();
      const rows = await sql<PurchaseRow[]>`
        SELECT payload FROM bh_billing_purchases
      `;
      return rows.map((row) => row.payload);
    },

    async listStripeEvents() {
      const sql = await ensureDurableSchema();
      const rows = await sql<{ payload: StripeEventLogRecord }[]>`
        SELECT payload FROM bh_billing_stripe_events
      `;
      return rows.map((row) => row.payload);
    },

    async upsertAccountAccess(record) {
      const sql = await ensureDurableSchema();
      const now = new Date().toISOString();
      await sql`
        INSERT INTO bh_billing_account_access (user_id, payload, updated_at)
        VALUES (${record.userId}, ${sql.json(record as never)}, ${now})
        ON CONFLICT (user_id) DO UPDATE SET
          payload = EXCLUDED.payload,
          updated_at = EXCLUDED.updated_at
      `;
      return record;
    },

    async findAccountAccessByUserId(userId) {
      const sql = await ensureDurableSchema();
      const rows = await sql<{ payload: AccountAccessRecord }[]>`
        SELECT payload FROM bh_billing_account_access WHERE user_id = ${userId} LIMIT 1
      `;
      return rows[0]?.payload;
    },

    async findNotificationByIdempotencyKey(key) {
      const sql = await ensureDurableSchema();
      const rows = await sql<{ payload: BillingNotificationRecord }[]>`
        SELECT payload FROM bh_billing_notifications
        WHERE idempotency_key = ${key}
        LIMIT 1
      `;
      return rows[0]?.payload;
    },

    async recordNotification(input) {
      const sql = await ensureDurableSchema();
      const existing = await sql<{ payload: BillingNotificationRecord }[]>`
        SELECT payload FROM bh_billing_notifications
        WHERE idempotency_key = ${input.idempotencyKey}
        LIMIT 1
      `;
      if (existing[0]) {
        return { status: "duplicate" as const, record: existing[0].payload };
      }
      const record: BillingNotificationRecord = {
        id: input.id ?? crypto.randomUUID(),
        idempotencyKey: input.idempotencyKey,
        userId: input.userId,
        template: input.template,
        status: input.status,
        locale: input.locale,
        offerId: input.offerId,
        detail: input.detail,
        createdAt: input.createdAt ?? new Date().toISOString(),
      };
      await sql`
        INSERT INTO bh_billing_notifications (id, idempotency_key, user_id, payload, created_at)
        VALUES (
          ${record.id},
          ${record.idempotencyKey},
          ${record.userId},
          ${sql.json(record as never)},
          ${record.createdAt}
        )
        ON CONFLICT (idempotency_key) DO NOTHING
      `;
      return { status: "created" as const, record };
    },

    async listNotificationsByUserId(userId) {
      const sql = await ensureDurableSchema();
      const rows = await sql<{ payload: BillingNotificationRecord }[]>`
        SELECT payload FROM bh_billing_notifications WHERE user_id = ${userId}
      `;
      return rows.map((row) => row.payload);
    },
  };
}

export function createUnconfiguredProductionBillingStore(): BillingStore {
  const reject = () =>
    Promise.reject(new DurablePersistenceError("billing_postgres_unconfigured"));
  return {
    findStripeEvent: reject,
    deleteStripeEvent: reject,
    recordStripeEvent: reject,
    upsertEntitlement: reject,
    findEntitlementsByUserId: reject,
    findEntitlementByUserAndKind: reject,
    findEntitlementsBySubscriptionId: reject,
    findEntitlementsByCheckoutSessionId: reject,
    findEntitlementsByPaymentIntentId: reject,
    upsertPurchase: reject,
    findPurchasesByUserId: reject,
    findPurchaseByCheckoutSessionId: reject,
    findPurchaseByPaymentIntentId: reject,
    findPurchaseByChargeId: reject,
    listPurchases: reject,
    listStripeEvents: reject,
    upsertAccountAccess: reject,
    findAccountAccessByUserId: reject,
    findNotificationByIdempotencyKey: reject,
    recordNotification: reject,
    listNotificationsByUserId: reject,
  };
}
