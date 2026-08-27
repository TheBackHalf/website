import { getAuthStore } from "@/lib/auth/store";
import { fulfillmentDueAt, privacySlaStateFor } from "@/lib/privacy/catalog";
import { identityTokenExpired, privacyTokensMatch } from "@/lib/privacy/identity";
import { getPrivacyStore } from "@/lib/privacy/store";
import { fulfillPrivacyRequest } from "@/lib/privacy/fulfill";
import type { PrivacyRequest } from "@/lib/privacy/types";

export async function verifyPrivacyRequestIdentity(input: {
  requestId: string;
  token: string;
  confirmDeletion?: boolean;
}): Promise<{ status: "verified" | "invalid" | "expired"; request?: PrivacyRequest }> {
  const store = getPrivacyStore();
  const existing = await store.get(input.requestId);
  if (!existing) return { status: "invalid" };
  if (existing.identity.status === "verified") {
    return { status: "verified", request: existing };
  }
  const hash = existing.identity.tokenHash;
  if (!hash || !privacyTokensMatch(input.token, hash)) {
    return { status: "invalid" };
  }
  if (identityTokenExpired(existing.identity.tokenExpiresAt)) {
    const now = new Date().toISOString();
    const denied = await store.upsert({
      ...existing,
      identity: { ...existing.identity, status: "failed" },
      status: "DENIED",
      updatedAt: now,
      slaState: "complete",
      history: [
        ...existing.history,
        {
          at: now,
          actor: "system",
          type: "identity_failed",
          note: "Confirmation link expired.",
        },
      ],
    });
    return { status: "expired", request: denied };
  }

  const user = await getAuthStore().findUserByEmail(existing.requesterEmail);
  const nowDate = new Date();
  const now = nowDate.toISOString();
  let verified: PrivacyRequest = {
    ...existing,
    identity: {
      ...existing.identity,
      status: "verified",
      verifiedAt: now,
      verifiedEmail: existing.requesterEmail,
      matchedUserId: user && !user.deletedAt ? user.id : existing.identity.matchedUserId,
      tokenHash: undefined,
    },
    status: "VERIFIED",
    fulfillmentDueAt: existing.fulfillmentDueAt ?? fulfillmentDueAt(nowDate),
    slaState: privacySlaStateFor("VERIFIED", existing.fulfillmentDueAt ?? fulfillmentDueAt(nowDate)),
    updatedAt: now,
    fulfillment: {
      ...existing.fulfillment,
      deletionConfirmed:
        existing.type === "DELETION"
          ? input.confirmDeletion === true || existing.fulfillment.deletionConfirmed
          : existing.fulfillment.deletionConfirmed,
    },
    history: [
      ...existing.history,
      {
        at: now,
        actor: "requester",
        type: "identity_verified",
        note: "Email confirmation completed.",
      },
    ],
  };
  verified = await store.upsert(verified);

  if (
    verified.type === "ACCESS" ||
    verified.type === "EXPORT" ||
    verified.type === "CONSENT_WITHDRAWAL" ||
    verified.type === "CORRECTION"
  ) {
    const fulfilled = await fulfillPrivacyRequest(verified.id);
    return { status: "verified", request: fulfilled.request };
  }
  if (verified.type === "DELETION" && verified.fulfillment.deletionConfirmed) {
    const fulfilled = await fulfillPrivacyRequest(verified.id, { confirmDeletion: true });
    return { status: "verified", request: fulfilled.request };
  }
  return { status: "verified", request: verified };
}
