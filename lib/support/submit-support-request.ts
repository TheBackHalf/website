import type { SupportRequestFormData, SupportSubmitResult } from "@/lib/support/types";
import { validateSupportRequest } from "@/lib/support/validation";
import { createSupportTicket } from "@/lib/support/create-ticket";

export async function submitSupportRequest(
  data: SupportRequestFormData,
): Promise<SupportSubmitResult> {
  const errors = validateSupportRequest(data);

  if (Object.keys(errors).length > 0) {
    return { status: "validation_error", errors };
  }

  try {
    const ticket = await createSupportTicket({
      requesterName: data.name,
      requesterEmail: data.email,
      isArchitect:
        data.isArchitect === "yes" || data.isArchitect === "no"
          ? data.isArchitect
          : "unknown",
      category: data.category,
      subject: data.subject,
      message: data.message,
      source: "form",
      channel: "web",
      test: data.email.includes("row153.") && data.email.endsWith("@example.com"),
    });

    return {
      status: "received",
      ticketId: ticket.id,
      acknowledgment: ticket.acknowledgment.status,
    };
  } catch {
    return { status: "error" };
  }
}
