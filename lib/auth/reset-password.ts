"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import { resetPasswordAction } from "@/lib/auth/actions/reset-password";
import { getPasswordRequirements } from "@/lib/auth/validation";
import type { Locale } from "@/lib/i18n/config";

export function useResetPassword(
  locale: Locale = "en",
  token: string,
  initialTokenStatus: "valid" | "invalid" | "expired" | "used" | "missing",
) {
  const dictionary = getDictionary(locale);
  const copy = dictionary.resetPassword;
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<
    Partial<Record<"password" | "passwordConfirm" | "form", string>>
  >({});
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "error"
  >("idle");

  const tokenMessage = (() => {
    if (initialTokenStatus === "missing") {
      return copy.missingToken;
    }

    if (initialTokenStatus === "invalid") {
      return copy.invalidToken;
    }

    if (initialTokenStatus === "expired") {
      return copy.expiredToken;
    }

    if (initialTokenStatus === "used") {
      return copy.usedToken;
    }

    return null;
  })();

  async function submit() {
    if (initialTokenStatus !== "valid") {
      return;
    }

    setSubmitState("submitting");
    setErrors({});

    const result = await resetPasswordAction({
      token,
      password,
      passwordConfirm,
      locale,
    });

    if (result.status === "validation_error") {
      setErrors(result.errors);
      setSubmitState("idle");
      return;
    }

    if (result.status === "invalid_token") {
      setErrors({ form: copy.invalidToken });
      setSubmitState("error");
      return;
    }

    if (result.status === "expired_token") {
      setErrors({ form: copy.expiredToken });
      setSubmitState("error");
      return;
    }

    if (result.status === "used_token") {
      setErrors({ form: copy.usedToken });
      setSubmitState("error");
      return;
    }

    if (result.status === "error") {
      setErrors({ form: result.message });
      setSubmitState("error");
      return;
    }

    router.push(result.redirectPath);
  }

  return {
    password,
    setPassword,
    passwordConfirm,
    setPasswordConfirm,
    errors,
    submitState,
    submit,
    tokenMessage,
    tokenValid: initialTokenStatus === "valid",
    copy,
    passwordRequirements: getPasswordRequirements(locale),
    submitLabel: translate(locale, copy.submit),
    dictionary,
  };
}
