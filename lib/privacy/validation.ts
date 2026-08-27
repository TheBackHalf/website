import type { Locale } from "@/lib/i18n/config";
import { isPrivacyRequestType, type PrivacyRequestType } from "@/lib/privacy/catalog";
import type { PrivacyRequestFormData } from "@/lib/privacy/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePrivacyRequest(
  data: PrivacyRequestFormData,
): Partial<Record<keyof PrivacyRequestFormData, string>> {
  const english = data.locale !== "es";
  const errors: Partial<Record<keyof PrivacyRequestFormData, string>> = {};
  if (!data.name.trim()) {
    errors.name = english ? "Name is required." : "El nombre es obligatorio.";
  }
  if (!data.email.trim()) {
    errors.email = english ? "Email is required." : "El correo es obligatorio.";
  } else if (!EMAIL.test(data.email.trim())) {
    errors.email = english
      ? "Enter a valid email address."
      : "Introduce un correo válido.";
  }
  if (!isPrivacyRequestType(data.type)) {
    errors.type = english
      ? "Select a privacy request type."
      : "Selecciona un tipo de solicitud de privacidad.";
  }
  if (!data.subject.trim()) {
    errors.subject = english ? "Subject is required." : "El asunto es obligatorio.";
  }
  if (!data.message.trim() || data.message.trim().length < 10) {
    errors.message = english
      ? "Message must be at least 10 characters."
      : "El mensaje debe tener al menos 10 caracteres.";
  }
  if (data.type === "DELETION" && data.confirmDeletion !== true) {
    errors.confirmDeletion = english
      ? "Deletion requests require confirmation."
      : "Las solicitudes de eliminación requieren confirmación.";
  }
  if (data.type === "CORRECTION") {
    const hasField =
      Boolean(data.firstName?.trim()) ||
      Boolean(data.lastName?.trim()) ||
      Boolean(data.timeZone?.trim());
    if (!hasField && !/\b(name|timezone|time zone|locale|nombre|apellido|zona horaria)\b/i.test(data.message)) {
      errors.message = english
        ? "Describe the correction, or provide the corrected first name, last name, or time zone."
        : "Describe la corrección, o indica el nombre, apellido o zona horaria corregidos.";
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
