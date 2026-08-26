import { parseCategory } from "@/lib/support/classify";
import { getDictionary } from "@/content/i18n/get-dictionary";
import type { SupportRequestFormData } from "@/lib/support/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSupportRequest(
  data: SupportRequestFormData,
): Partial<Record<keyof SupportRequestFormData, string>> {
  const forms = getDictionary(data.locale).forms;
  const errors: Partial<Record<keyof SupportRequestFormData, string>> = {};

  if (!data.name.trim()) {
    errors.name = forms.nameRequired;
  }

  if (!data.email.trim()) {
    errors.email = forms.emailRequired;
  } else if (!EMAIL_PATTERN.test(data.email.trim())) {
    errors.email = forms.emailInvalid;
  }

  if (!data.category.trim() || !parseCategory(data.category)) {
    errors.category = forms.categoryRequired;
  }

  if (!data.subject.trim()) {
    errors.subject = forms.subjectRequired;
  }

  if (!data.message.trim()) {
    errors.message = forms.messageRequired;
  } else if (data.message.trim().length < 10) {
    errors.message = forms.messageMinLength;
  } else if (data.message.trim().length > 4000) {
    errors.message = forms.messageMinLength;
  }

  if (data.name.trim().length > 200) {
    errors.name = forms.nameRequired;
  }
  if (data.subject.trim().length > 200) {
    errors.subject = forms.subjectRequired;
  }

  return errors;
}
