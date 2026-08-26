import { getSiteUrl } from "@/lib/auth/config";
import { getServerSession } from "@/lib/auth/session/server";
import { getAuthStore } from "@/lib/auth/store";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { redactSensitive } from "@/lib/support/sanitize";
import {
  acknowledgmentDueAt,
  defaultPrivacyOwner,
  fulfillmentDueAt,
  OPEN_PRIVACY_REQUEST_STATUSES,
  privacySlaStateFor,
  type PrivacyRequestType,
  type PrivacySource,
} from "@/lib/privacy/catalog";
import { sendPrivacyAcknowledgment } from "@/lib/privacy/acknowledge";
import { classifyPrivacyText } from "@/lib/privacy/classify";
import { generatePrivacyToken, normalizeArcCode } from "@/lib/privacy/identity";
import { createPrivacyRequestId } from "@/lib/privacy/ids";
import { getPrivacyStore } from "@/lib/privacy/store";
import type {
  PrivacyCorrectionPayload,
  PrivacyIdentity,
  PrivacyRequest,
} from "@/lib/privacy/types";
import type { Locale } from "@/lib/i18n/config";

export type CreatePrivacyRequestInput = {
  requesterName: string;
  requesterEmail: string;
  type?: string;
  subject: string;
  message: string;
  source: PrivacySource;
  locale?: Locale;
  arcCode?: string;
  confirmDeletion?: boolean;
  correction?: PrivacyCorrectionPayload;
  supportTicketId?: string;
  test?: boolean;
  acknowledge?: boolean;
};

function publicVerifyUrl(requestId: string, token: string, locale: Locale): string {
  const prefix = locale === "es" ? "/es" : "";
  return `${getSiteUrl()}${prefix}/privacy/verify?id=${encodeURIComponent(requestId)}&token=${encodeURIComponent(token)}`;
}

export async function createPrivacyRequest(
  input: CreatePrivacyRequestInput,
): Promise<{ request: PrivacyRequest; verifyToken?: string }> {
  const now = new Date();
  const store = getPrivacyStore();
  const email = normalizeEmail(input.requesterEmail);
  const classified = classifyPrivacyText(input.type, input.subject, input.message);
  const type: PrivacyRequestType =
    classified.kind === "rights" ? classified.type : "INQUIRY";
  const subject = redactSensitive(input.subject.trim() || "Privacy request").text;
  const message = redactSensitive(input.message.trim()).text;

  const recent = (await store.list({ includeTest: true, email })).find((entry) => {
    if (entry.type !== type) return false;
    if (!OPEN_PRIVACY_REQUEST_STATUSES.includes(entry.status)) return false;
    const ageMs = Date.now() - Date.parse(entry.createdAt);
    return Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 15 * 60 * 1000;
  });
  if (recent) return { request: recent };

  const session = await getServerSession().catch(() => null);
  const sessionMatch = Boolean(
    session?.email && normalizeEmail(session.email) === email,
  );
  const user =
    (sessionMatch && session?.sub
      ? await getAuthStore().findUserById(session.sub)
      : undefined) ?? (await getAuthStore().findUserByEmail(email));

  let identity: PrivacyIdentity;
  let rawToken: string | undefined;
  if (sessionMatch && user && !user.deletedAt) {
    identity = {
      status: "verified",
      method: "session",
      verifiedAt: now.toISOString(),
      verifiedEmail: email,
      matchedUserId: user.id,
      arcCodePresented: Boolean(input.arcCode && normalizeArcCode(input.arcCode) === user.arcCode),
    };
  } else {
    const generated = generatePrivacyToken();
    rawToken = generated.token;
    identity = {
      status: "pending",
      method: "email_token",
      tokenHash: generated.hash,
      tokenExpiresAt: generated.expiresAt,
      matchedUserId: user && !user.deletedAt ? user.id : undefined,
      arcCodePresented: Boolean(
        input.arcCode && user && normalizeArcCode(input.arcCode) === user.arcCode,
      ),
    };
  }

  const status = identity.status === "verified" ? "VERIFIED" : "IDENTITY_PENDING";
  const due =
    identity.status === "verified" ? fulfillmentDueAt(now) : undefined;
  const id = createPrivacyRequestId(now);
  const locale = input.locale === "es" ? "es" : "en";

  let request: PrivacyRequest = {
    id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    requesterName: input.requesterName.trim() || "Architect",
    requesterEmail: email,
    type,
    subject,
    message,
    status,
    assignedOwner: defaultPrivacyOwner(type),
    identity,
    acknowledgment: { status: "not_configured" },
    acknowledgmentDueAt: acknowledgmentDueAt(now),
    fulfillmentDueAt: due,
    slaState: privacySlaStateFor(status, due, now),
    correction: input.correction,
    fulfillment: { systems: [], deletionConfirmed: input.confirmDeletion === true },
    history: [
      {
        at: now.toISOString(),
        actor: "system",
        type: "created",
        note: `Created from ${input.source}. Type ${type}. Identity ${identity.status} via ${identity.method}.`,
      },
    ],
    source: input.source,
    supportTicketId: input.supportTicketId,
    locale,
    test: input.test,
  };

  if (input.acknowledge !== false) {
    request.acknowledgment = await sendPrivacyAcknowledgment({
      requestId: request.id,
      requesterName: request.requesterName,
      requesterEmail: request.requesterEmail,
      type: request.type,
      identityPending: identity.status === "pending",
      verifyUrl: rawToken ? publicVerifyUrl(request.id, rawToken, locale) : undefined,
      locale,
    });
    request.history.push({
      at: new Date().toISOString(),
      actor: "system",
      type: "acknowledged",
      note: `Acknowledgment ${request.acknowledgment.status}.`,
    });
  }

  return { request: await store.upsert(request), verifyToken: rawToken };
}
