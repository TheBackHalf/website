import type { Locale } from "@/lib/i18n/config";

export type SupportRequestFormData = {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  isArchitect: "yes" | "no" | "";
  locale: Locale;
};

export type SupportSubmitResult =
  | { status: "received"; ticketId: string; acknowledgment: string }
  | {
      status: "validation_error";
      errors: Partial<Record<keyof SupportRequestFormData, string>>;
    }
  | { status: "error" };
