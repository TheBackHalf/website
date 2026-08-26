import { normalizeEmail } from "@/lib/auth/normalize-email";
import { getAuthStore } from "@/lib/auth/store";
import { listIanaTimeZones } from "@/lib/account/time-zones";
import { fulfillmentDueAt, privacySlaStateFor } from "@/lib/privacy/catalog";
import { buildPrivacyExportPackage } from "@/lib/privacy/export";
import { eraseParticipantContent, withdrawLuminaMemoryConsent } from "@/lib/privacy/erase";
import { activeLegalHoldFor } from "@/lib/privacy/legal-hold";
import { getPrivacyStore } from "@/lib/privacy/store";
import type {
  PrivacyExportPackage,
  PrivacyRequest,
  PrivacySystemAction,
} from "@/lib/privacy/types";

const TIME_ZONES = new Set(listIanaTimeZones());

function requireVerified(request: PrivacyRequest): void {
  if (request.identity.status !== "verified") {
    throw new Error("privacy_identity_not_verified");
  }
}

export async function fulfillPrivacyRequest(
  id: string,
  options?: { confirmDeletion?: boolean },
): Promise<{ request: PrivacyRequest; exportPackage?: PrivacyExportPackage }> {
  const store = getPrivacyStore();
  const existing = await store.get(id);
  if (!existing) {
    throw new Error(`Unknown privacy request ${id}`);
  }
  requireVerified(existing);

  const now = new Date().toISOString();
  let next: PrivacyRequest = {
    ...existing,
    status: "IN_PROGRESS",
    updatedAt: now,
    fulfillment: {
      ...existing.fulfillment,
      startedAt: existing.fulfillment.startedAt ?? now,
    },
    history: [
      ...existing.history,
      {
        at: now,
        actor: "imani",
        type: "fulfillment_started",
        note: `Fulfillment started for ${existing.type}.`,
      },
    ],
  };

  if (next.type === "INQUIRY") {
    next = {
      ...next,
      status: "IN_PROGRESS",
      fulfillment: {
        ...next.fulfillment,
        systems: [
          {
            systemId: "privacy_rights_requests",
            action: "manual_follow_up",
            reason: "Inquiry routed. No autonomous legal answer.",
          },
        ],
        notes: "Michelle routes. Imani if technical. Founder if regulator/attorney.",
      },
    };
    return { request: await store.upsert(next) };
  }

  if (next.type === "ACCESS" || next.type === "EXPORT") {
    const exportPackage = await buildPrivacyExportPackage(next);
    next = {
      ...next,
      status: "FULFILLED",
      fulfillmentDueAt: next.fulfillmentDueAt ?? fulfillmentDueAt(new Date()),
      slaState: "complete",
      fulfillment: {
        ...next.fulfillment,
        completedAt: now,
        exportGenerated: true,
        systems: exportPackage.systems.map((systemId) => ({
          systemId,
          action: "exported" as const,
        })),
      },
      history: [
        ...next.history,
        {
          at: now,
          actor: "imani",
          type: "fulfilled",
          note: `${next.type} package generated. Secrets omitted.`,
        },
      ],
    };
    return { request: await store.upsert(next), exportPackage };
  }

  if (next.type === "CORRECTION") {
    const userId = next.identity.matchedUserId;
    const user = userId ? await getAuthStore().findUserById(userId) : undefined;
    if (!user || user.deletedAt) {
      next = {
        ...next,
        status: "DENIED",
        slaState: "complete",
        fulfillment: {
          ...next.fulfillment,
          completedAt: now,
          notes: "No matching active account to correct.",
        },
        history: [
          ...next.history,
          {
            at: now,
            actor: "system",
            type: "denied",
            note: "No matching active account.",
          },
        ],
      };
      return { request: await store.upsert(next) };
    }
    const firstName = next.correction?.firstName?.trim() || user.firstName;
    const lastName = next.correction?.lastName?.trim() || user.lastName;
    const timeZone = next.correction?.timeZone?.trim();
    const locale = next.correction?.locale;
    const patch: {
      firstName: string;
      lastName: string;
      timeZone?: string;
      locale?: "en" | "es";
    } = { firstName, lastName };
    if (timeZone && TIME_ZONES.has(timeZone)) patch.timeZone = timeZone;
    if (locale === "en" || locale === "es") patch.locale = locale;
    await getAuthStore().updateUser(user.id, patch);
    const systems: PrivacySystemAction[] = [
      { systemId: "auth_accounts", action: "corrected" },
    ];
    next = {
      ...next,
      status: "FULFILLED",
      slaState: "complete",
      fulfillment: {
        ...next.fulfillment,
        completedAt: now,
        systems,
      },
      history: [
        ...next.history,
        {
          at: now,
          actor: "imani",
          type: "fulfilled",
          note: "Profile fields updated after identity verification.",
        },
      ],
    };
    return { request: await store.upsert(next) };
  }

  if (next.type === "CONSENT_WITHDRAWAL") {
    const userId = next.identity.matchedUserId;
    if (!userId) {
      next = {
        ...next,
        status: "DENIED",
        slaState: "complete",
        fulfillment: {
          ...next.fulfillment,
          completedAt: now,
          notes: "No matching account for consent withdrawal.",
        },
      };
      return { request: await store.upsert(next) };
    }
    const systems = await withdrawLuminaMemoryConsent(userId);
    next = {
      ...next,
      status: "FULFILLED",
      slaState: "complete",
      fulfillment: {
        ...next.fulfillment,
        completedAt: now,
        systems,
        notes:
          "Lumina memory is withdrawable. Required service consents are not withdrawn while the account remains active.",
      },
      history: [
        ...next.history,
        {
          at: now,
          actor: "imani",
          type: "fulfilled",
          note: "Lumina memory consent withdrawn.",
        },
      ],
    };
    return { request: await store.upsert(next) };
  }

  const userId = next.identity.matchedUserId;
  const hold = activeLegalHoldFor({
    userId,
    email: next.requesterEmail,
  });
  if (hold) {
    next = {
      ...next,
      status: "WAITING_ON_REQUESTER",
      fulfillment: {
        ...next.fulfillment,
        legalHoldBlocked: true,
        systems: [
          {
            systemId: "privacy_rights_requests",
            action: "hold",
            reason: `Operational hold ${hold.id}. Human legal review required.`,
          },
        ],
        notes: "Deletion paused for legal hold. No legal conclusion about hold scope.",
      },
      history: [
        ...next.history,
        {
          at: now,
          actor: "michelle",
          type: "hold",
          note: `Deletion paused. Hold ${hold.id}.`,
        },
      ],
    };
    return { request: await store.upsert(next) };
  }

  if (options?.confirmDeletion !== true && next.fulfillment.deletionConfirmed !== true) {
    next = {
      ...next,
      status: "WAITING_ON_REQUESTER",
      fulfillment: {
        ...next.fulfillment,
        notes: "Deletion requires explicit confirmation after identity verification.",
      },
    };
    return { request: await store.upsert(next) };
  }

  if (!userId) {
    next = {
      ...next,
      status: "PARTIALLY_FULFILLED",
      slaState: "complete",
      fulfillment: {
        ...next.fulfillment,
        completedAt: now,
        deletionConfirmed: true,
        notes:
          "No matching account. Correspondence and request records retained. Vendor/mailbox follow-up is manual.",
        systems: [
          {
            systemId: "auth_accounts",
            action: "not_applicable",
            reason: "No matching account",
          },
          {
            systemId: "support_tickets",
            action: "retained",
            retainOnDeletionRequest: true,
          },
          {
            systemId: "privacy_rights_requests",
            action: "retained",
            retainOnDeletionRequest: true,
          },
        ],
      },
    };
    return { request: await store.upsert(next) };
  }

  const systems = await eraseParticipantContent(userId);
  const held = systems.some((entry) => entry.action === "hold");
  const partial = systems.some((entry) => entry.retainOnDeletionRequest);
  next = {
    ...next,
    status: held ? "WAITING_ON_REQUESTER" : partial ? "PARTIALLY_FULFILLED" : "FULFILLED",
    slaState: held ? privacySlaStateFor("WAITING_ON_REQUESTER", next.fulfillmentDueAt) : "complete",
    fulfillment: {
      ...next.fulfillment,
      completedAt: held ? undefined : now,
      deletionConfirmed: true,
      legalHoldBlocked: held,
      systems,
    },
    history: [
      ...next.history,
      {
        at: now,
        actor: "imani",
        type: held ? "hold" : "fulfilled",
        note: held
          ? "Deletion paused for operational hold."
          : "Account anonymized; participant content deleted; retained classes documented.",
      },
    ],
  };
  return { request: await store.upsert(next) };
}

export async function closePrivacyRequest(
  id: string,
  note?: string,
): Promise<PrivacyRequest> {
  const store = getPrivacyStore();
  const existing = await store.get(id);
  if (!existing) throw new Error(`Unknown privacy request ${id}`);
  const now = new Date().toISOString();
  return store.upsert({
    ...existing,
    status: "CLOSED",
    updatedAt: now,
    slaState: "complete",
    history: [
      ...existing.history,
      {
        at: now,
        actor: "michelle",
        type: "closed",
        note: note ?? "Closed.",
      },
    ],
  });
}

export function requesterEmailMatches(
  request: PrivacyRequest,
  email: string,
): boolean {
  return request.requesterEmail === normalizeEmail(email);
}
