import type { Locale } from "@/lib/i18n/config";
import { isPrivacyRequestType, type PrivacyRequestType } from "@/lib/privacy/catalog";
import type { PrivacyRequestFormData } from "@/lib/privacy/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePrivacyRequest(
  data: PrivacyRequestFormData,
): Partial<Record<keyof PrivacyRequestFormData, string>> {
  const errors: Partial<Record<keyof PrivacyRequestFormData, string>> = {};
  if (!data.name.trim()) errors.name = "Name is required.";
  if (!data.email.trim()) errors.email = "Email is required.";
  else if (!EMAIL.test(data.email.trim())) errors.email = "Enter a valid email address.";
  if (!isPrivacyRequestType(data.type)) errors.type = "Select a privacy request type.";
  if (!data.subject.trim()) errors.subject = "Subject is required.";
  if (!data.message.trim() || data.message.trim().length < 10) {
    errors.message = "Message must be at least 10 characters.";
  }
  if (data.type === "DELETION" && data.confirmDeletion !== true) {
    errors.confirmDeletion = "Deletion requests require confirmation.";
  }
  if (data.type === "CORRECTION") {
    const hasField =
      Boolean(data.firstName?.trim()) ||
      Boolean(data.lastName?.trim()) ||
      Boolean(data.timeZone?.trim());
    if (!hasField && !/\b(name|timezone|time zone|locale)\b/i.test(data.message)) {
      errors.message =
        "Describe the correction, or provide the corrected first name, last name, or time zone.";
    }
  }
  return errors;
}

export function parsePrivacyType(value: string): PrivacyRequestType | undefined {
  return isPrivacyRequestType(value) ? value : undefined;
}

export function localeFromUnknown(value: unknown): Locale {
  return value === "es" ? "es" : "en";
}
