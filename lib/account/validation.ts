import { getDictionary } from "@/content/i18n/get-dictionary";
import {
  type ProfileFormData,
  type ProfileValidationErrors,
} from "@/lib/account/profile";
import { isValidIanaTimeZone } from "@/lib/account/time-zones";
import type { Locale } from "@/lib/i18n/config";

const NAME_MAX = 80;

export function validateProfileForm(
  data: ProfileFormData,
  locale: Locale,
): ProfileValidationErrors {
  const copy = getDictionary(locale).appShell.settings;
  const errors: ProfileValidationErrors = {};

  if (!data.firstName.trim()) {
    errors.firstName = copy.firstNameRequired;
  } else if (data.firstName.trim().length > NAME_MAX) {
    errors.firstName = copy.firstNameTooLong;
  }

  if (!data.lastName.trim()) {
    errors.lastName = copy.lastNameRequired;
  } else if (data.lastName.trim().length > NAME_MAX) {
    errors.lastName = copy.lastNameTooLong;
  }

  if (data.locale !== "en" && data.locale !== "es") {
    errors.locale = copy.languageRequired;
  }

  if (!data.timeZone.trim()) {
    errors.timeZone = copy.timeZoneRequired;
  } else if (!isValidIanaTimeZone(data.timeZone.trim())) {
    errors.timeZone = copy.timeZoneInvalid;
  }

  return errors;
}
