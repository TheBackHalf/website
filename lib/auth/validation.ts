import { getDictionary } from "@/content/i18n/get-dictionary";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/config";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { validatePasswordStrength } from "@/lib/auth/password";
import type {
  LoginFormData,
  LoginValidationErrors,
  RegistrationFormData,
  RegistrationValidationErrors,
} from "@/lib/auth/types";
import type { Locale } from "@/lib/i18n/config";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistrationForm(
  data: RegistrationFormData,
): RegistrationValidationErrors {
  const dictionary = getDictionary(data.locale);
  const registration = dictionary.registration;
  const forms = dictionary.forms;
  const errors: RegistrationValidationErrors = {};

  if (!data.firstName.trim()) {
    errors.firstName = registration.firstNameRequired;
  }

  if (!data.lastName.trim()) {
    errors.lastName = registration.lastNameRequired;
  }

  if (!data.email.trim()) {
    errors.email = forms.emailRequired;
  } else if (!EMAIL_PATTERN.test(normalizeEmail(data.email))) {
    errors.email = forms.emailInvalid;
  }

  const passwordError = validatePasswordStrength(data.password);
  if (!data.password) {
    errors.password = registration.passwordRequired;
  } else if (passwordError) {
    errors.password = passwordError;
  }

  if (!data.passwordConfirm) {
    errors.passwordConfirm = registration.passwordConfirmRequired;
  } else if (data.password !== data.passwordConfirm) {
    errors.passwordConfirm = registration.passwordMismatch;
  }

  return errors;
}

export function getPasswordRequirements(locale: RegistrationFormData["locale"]): string {
  const registration = getDictionary(locale).registration;
  return registration.passwordRequirements.replace(
    "{min}",
    String(PASSWORD_MIN_LENGTH),
  );
}

export const DUPLICATE_EMAIL_MESSAGE =
  "An account with this email address already exists. Sign in or use a different email.";

export const GENERIC_REGISTRATION_ERROR =
  "We could not create your account. Please try again.";

export const REGISTRATION_UNAVAILABLE_ERROR =
  "Account registration is temporarily unavailable. Please try again shortly.";

export function validateLoginForm(data: LoginFormData): LoginValidationErrors {
  const dictionary = getDictionary(data.locale);
  const errors: LoginValidationErrors = {};

  if (!data.email.trim()) {
    errors.email = dictionary.forms.emailRequired;
  } else if (!EMAIL_PATTERN.test(normalizeEmail(data.email))) {
    errors.email = dictionary.forms.emailInvalid;
  }

  if (!data.password) {
    errors.password = dictionary.login.passwordRequired;
  }

  return errors;
}

export function validatePasswordResetForm(
  locale: Locale,
  password: string,
  passwordConfirm: string,
): Partial<Record<"password" | "passwordConfirm", string>> {
  const registration = getDictionary(locale).registration;
  const errors: Partial<Record<"password" | "passwordConfirm", string>> = {};
  const passwordError = validatePasswordStrength(password);

  if (!password) {
    errors.password = registration.passwordRequired;
  } else if (passwordError) {
    errors.password = passwordError;
  }

  if (!passwordConfirm) {
    errors.passwordConfirm = registration.passwordConfirmRequired;
  } else if (password !== passwordConfirm) {
    errors.passwordConfirm = registration.passwordMismatch;
  }

  return errors;
}

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_PATTERN.test(normalizeEmail(email));
}
