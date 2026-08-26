"use client";

import { useState } from "react";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import { requestPasswordResetAction } from "@/lib/auth/actions/forgot-password";
import type { Locale } from "@/lib/i18n/config";

export function useForgotPassword(locale: Locale = "en") {
  const dictionary = getDictionary(locale);
  const copy = dictionary.forgotPassword;
  const emailInvalid = dictionary.forms.emailInvalid;

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "accepted" | "error"
  >("idle");

  async function submit() {
    setSubmitState("submitting");
    setError(null);

    const result = await requestPasswordResetAction({ email, locale });

    if (result.status === "validation_error") {
      setError(result.errors.email ?? result.errors.form ?? emailInvalid);
      setSubmitState("idle");
      return;
    }

    if (result.status === "error") {
      setError(result.message);
      setSubmitState("error");
      return;
    }

    setSubmitState("accepted");
  }

  return {
    email,
    setEmail,
    error,
    submitState,
    submit,
    copy,
    acceptedMessage: copy.accepted,
    submitLabel: translate(locale, copy.submit),
    backToLoginLabel: translate(locale, copy.backToLogin),
    dictionary,
  };
}
