"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  consentStateFromDocuments,
  consentValuesFromState,
  type ConsentState,
} from "@/components/legal/consent-controls";
import { accountCreationConsents } from "@/content/legal/documents";
import { getDictionary } from "@/content/i18n/get-dictionary";
import {
  registerWithEmailAction,
  setRegistrationConsentCookie,
} from "@/lib/auth/actions/register-email";
import { getRegistrationConfirmationPath } from "@/lib/auth/routing";
import type { RegistrationFormData, RegistrationValidationErrors } from "@/lib/auth/types";
import { getPasswordRequirements } from "@/lib/auth/validation";
import {
  documentToConsentType,
  validateRequiredConsents,
} from "@/lib/consent/validation";
import type { ConsentValidationErrors } from "@/lib/consent/types";
import type { Locale } from "@/lib/i18n/config";
import {
  emitRegistrationClientEvent,
  readAnonymousAnalyticsId,
  readClientAttribution,
} from "@/components/analytics/product-analytics-beacon";

function createEmptyForm(locale: Locale): RegistrationFormData {
  return {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    passwordConfirm: "",
    locale,
  };
}

type UseArchitectRegistrationOptions = {
  googleAuthEnabled: boolean;
};

/** Row 63 — account registration state and actions for the Architect signup flow. */
export function useArchitectRegistration(
  locale: Locale = "en",
  { googleAuthEnabled }: UseArchitectRegistrationOptions,
) {
  const dictionary = getDictionary(locale);
  const registration = dictionary.registration;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<RegistrationFormData>(() =>
    createEmptyForm(locale),
  );
  const [consents, setConsents] = useState<ConsentState>(() =>
    consentStateFromDocuments(accountCreationConsents),
  );
  const [errors, setErrors] = useState<RegistrationValidationErrors>({});
  const [consentErrors, setConsentErrors] = useState<ConsentValidationErrors>({});
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [googleState, setGoogleState] = useState<"idle" | "loading">("idle");

  const googleNotice = useMemo(() => {
    const googleParam = searchParams.get("google");

    if (googleParam === "not_configured") {
      return null;
    }

    if (googleParam === "cancelled") {
      return registration.googleCancelled;
    }

    if (googleParam === "conflict") {
      return registration.googleConflict;
    }

    if (googleParam === "consent_required") {
      return registration.googleConsentRequired;
    }

    if (googleParam === "no_account") {
      return registration.googleNoAccount;
    }

    if (googleParam === "age_required") {
      return registration.googleAgeRequired;
    }

    return null;
  }, [registration, searchParams]);

  const updateField = useCallback(
    <K extends keyof RegistrationFormData>(key: K, value: RegistrationFormData[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
      setErrors((current) => {
        if (!current[key]) {
          return current;
        }

        const next = { ...current };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const updateConsent = useCallback((documentId: string, accepted: boolean) => {
    setConsents((current) => ({ ...current, [documentId]: accepted }));
    setConsentErrors((current) => {
      const consentType = documentToConsentType(documentId);
      if (!current[consentType]) {
        return current;
      }

      const next = { ...current };
      delete next[consentType];
      return next;
    });
  }, []);

  const submitEmailRegistration = useCallback(async () => {
    const consentValues = consentValuesFromState(accountCreationConsents, consents);
    const nextConsentErrors = validateRequiredConsents(
      accountCreationConsents,
      consentValues,
    );

    setConsentErrors(nextConsentErrors);

    if (Object.keys(nextConsentErrors).length > 0) {
      setErrors({ consent: registration.consentRequired });
      return;
    }

    setSubmitState("submitting");
    emitRegistrationClientEvent({
      name: "registration_started",
      method: "email",
    });
    emitRegistrationClientEvent({
      name: "registration_method_selected",
      method: "email",
    });

    const result = await registerWithEmailAction({
      ...form,
      locale,
      consents: consentValues,
      attribution: readClientAttribution(),
      anonymousId: readAnonymousAnalyticsId(),
    });

    if (result.status === "validation_error") {
      setErrors(result.errors);
      setSubmitState("idle");
      return;
    }

    if (result.status === "duplicate") {
      setErrors({ email: registration.duplicateEmail });
      setSubmitState("idle");
      return;
    }

    if (result.status === "consent_required") {
      setErrors({ consent: registration.consentRequired });
      setSubmitState("idle");
      return;
    }

    if (result.status === "age_ineligible") {
      router.push(locale === "es" ? "/es/not-eligible" : "/not-eligible");
      setSubmitState("idle");
      return;
    }

    if (result.status === "error") {
      setErrors({ form: result.message });
      setSubmitState("error");
      return;
    }

    setSubmitState("success");
    router.push(
      `${getRegistrationConfirmationPath(locale)}?email=${encodeURIComponent(form.email)}`,
    );
  }, [consents, form, locale, registration, router]);

  const startGoogleRegistration = useCallback(async () => {
    const consentValues = consentValuesFromState(accountCreationConsents, consents);
    const nextConsentErrors = validateRequiredConsents(
      accountCreationConsents,
      consentValues,
    );

    setConsentErrors(nextConsentErrors);

    if (Object.keys(nextConsentErrors).length > 0) {
      setErrors({ consent: registration.consentRequired });
      return;
    }

    setGoogleState("loading");
    emitRegistrationClientEvent({
      name: "registration_started",
      method: "google",
    });
    emitRegistrationClientEvent({
      name: "registration_method_selected",
      method: "google",
    });
    const cookieResult = await setRegistrationConsentCookie(consentValues, locale, {
      attribution: readClientAttribution(),
      anonymousId: readAnonymousAnalyticsId(),
    });

    if (cookieResult.status === "consent_required") {
      setErrors({ consent: registration.consentRequired });
      setGoogleState("idle");
      return;
    }

    if (cookieResult.status === "age_ineligible") {
      router.push(locale === "es" ? "/es/not-eligible" : "/not-eligible");
      setGoogleState("idle");
      return;
    }

    window.location.href = `/api/auth/google?locale=${locale}`;
  }, [consents, locale, registration.consentRequired, router]);

  return {
    form,
    consents,
    errors,
    consentErrors,
    submitState,
    googleState,
    googleNotice,
    googleConfigured: googleAuthEnabled,
    updateField,
    updateConsent,
    submitEmailRegistration,
    startGoogleRegistration,
    dictionary,
    registration,
    passwordRequirements: getPasswordRequirements(locale),
  };
}
