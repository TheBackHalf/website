import type { PrivacyRequestFormData, PrivacySubmitResult } from "@/lib/privacy/types";
import { validatePrivacyRequest } from "@/lib/privacy/validation";
import { createPrivacyRequest } from "@/lib/privacy/create-request";

export async function submitPrivacyRequest(
  data: PrivacyRequestFormData,
  options?: { source?: "privacy_form" | "architect_settings" },
): Promise<PrivacySubmitResult> {
  const errors = validatePrivacyRequest(data);
  if (Object.keys(errors).length > 0) {
    return { status: "validation_error", errors };
  }

  try {
    const created = await createPrivacyRequest({
      requesterName: data.name,
      requesterEmail: data.email,
      type: data.type,
      subject: data.subject,
      message: data.message,
      source: options?.source ?? "privacy_form",
      locale: data.locale,
      arcCode: data.arcCode,
      confirmDeletion: data.confirmDeletion,
      correction: {
        firstName: data.firstName,
        lastName: data.lastName,
        timeZone: data.timeZone,
        locale: data.locale,
      },
      test: data.email.includes("row167.") && data.email.endsWith("@example.com"),
    });
    return {
      status: "received",
      requestId: created.request.id,
      identity: created.request.identity.status,
    };
  } catch {
    return { status: "error" };
  }
}
