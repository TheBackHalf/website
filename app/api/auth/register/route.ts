import { NextResponse } from "next/server";
import { accountCreationConsents } from "@/content/legal/documents";
import {
  registerWithEmailAction,
  type RegisterEmailActionInput,
} from "@/lib/auth/actions/register-email";
import { documentToConsentType } from "@/lib/consent/validation";
import type { ConsentValue } from "@/lib/consent/types";
import { isLocale } from "@/lib/i18n/config";

export const runtime = "nodejs";

function parseConsents(value: unknown): ConsentValue[] | null {
  if (!Array.isArray(value)) {
    return accountCreationConsents.map((document) => ({
      consentType: documentToConsentType(document.id),
      documentId: document.id,
      accepted: false,
    }));
  }

  const parsed: ConsentValue[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const row = entry as Record<string, unknown>;
    if (typeof row.documentId !== "string" || typeof row.accepted !== "boolean") {
      return null;
    }
    parsed.push({
      consentType: documentToConsentType(row.documentId),
      documentId: row.documentId,
      accepted: row.accepted,
    });
  }
  return parsed;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "error", message: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ status: "error", message: "invalid_json" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const consents = parseConsents(input.consents);
  if (!consents) {
    return NextResponse.json({ status: "error", message: "invalid_consents" }, { status: 400 });
  }

  const locale = typeof input.locale === "string" && isLocale(input.locale) ? input.locale : "en";
  const payload: RegisterEmailActionInput = {
    firstName: typeof input.firstName === "string" ? input.firstName : "",
    lastName: typeof input.lastName === "string" ? input.lastName : "",
    email: typeof input.email === "string" ? input.email : "",
    password: typeof input.password === "string" ? input.password : "",
    passwordConfirm:
      typeof input.passwordConfirm === "string" ? input.passwordConfirm : "",
    locale,
    consents,
    attribution: input.attribution,
    anonymousId: typeof input.anonymousId === "string" ? input.anonymousId : undefined,
  };

  const result = await registerWithEmailAction(payload);
  const status =
    result.status === "success"
      ? 201
      : result.status === "duplicate"
        ? 409
        : result.status === "age_ineligible"
          ? 403
          : result.status === "rate_limited"
            ? 429
          : result.status === "error"
            ? 503
            : 400;

  return NextResponse.json(result, { status });
}
