"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import { loginWithEmailAction } from "@/lib/auth/actions/login-email";
import type { LoginFormData, LoginValidationErrors } from "@/lib/auth/types";
import type { Locale } from "@/lib/i18n/config";

type UseArchitectLoginOptions = {
  googleAuthEnabled: boolean;
};

export function useArchitectLogin(
  locale: Locale = "en",
  { googleAuthEnabled }: UseArchitectLoginOptions,
) {
  const dictionary = getDictionary(locale);
  const login = dictionary.login;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<LoginFormData>({
    email: "",
    password: "",
    locale,
  });
  const [errors, setErrors] = useState<LoginValidationErrors>({});
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "error"
  >("idle");
  const [googleState, setGoogleState] = useState<"idle" | "loading">("idle");

  const googleNotice = useMemo(() => {
    const googleParam = searchParams.get("google");

    if (googleParam === "not_configured") {
      return null;
    }

    if (googleParam === "cancelled") {
      return login.googleCancelled;
    }

    if (googleParam === "conflict") {
      return login.googleConflict;
    }

    if (googleParam === "failed" || googleParam === "invalid") {
      return login.googleFailed;
    }

    return null;
  }, [login, searchParams]);

  const resetNotice = useMemo(() => {
    if (searchParams.get("reset") === "success") {
      return login.resetSuccess;
    }

    return null;
  }, [login.resetSuccess, searchParams]);

  const updateField = useCallback(
    <K extends keyof LoginFormData>(key: K, value: LoginFormData[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
      setErrors((current) => {
        if (!current[key as keyof LoginValidationErrors]) {
          return current;
        }

        const next = { ...current };
        delete next[key as keyof LoginValidationErrors];
        return next;
      });
    },
    [],
  );

  const submitEmailLogin = useCallback(async () => {
    setSubmitState("submitting");
    setErrors({});

    const result = await loginWithEmailAction({
      ...form,
      locale,
      next: searchParams.get("next") ?? undefined,
    });

    if (result.status === "validation_error") {
      setErrors(result.errors);
      setSubmitState("idle");
      return;
    }

    if (result.status === "invalid_credentials" || result.status === "rate_limited") {
      setErrors({ form: login.invalidCredentials });
      setSubmitState("error");
      return;
    }

    if (result.status === "error") {
      setErrors({ form: result.message });
      setSubmitState("error");
      return;
    }

    router.push(result.redirectPath);
  }, [form, locale, login.invalidCredentials, router, searchParams]);

  const startGoogleLogin = useCallback(() => {
    setGoogleState("loading");
    window.location.href = `/api/auth/google?locale=${locale}&intent=login`;
  }, [locale]);

  return {
    form,
    errors,
    submitState,
    googleState,
    googleNotice,
    resetNotice,
    googleConfigured: googleAuthEnabled,
    updateField,
    submitEmailLogin,
    startGoogleLogin,
    dictionary,
    login,
    signInLabel: translate(locale, login.signIn),
    continueWithGoogleLabel: translate(locale, login.continueWithGoogle),
    forgotPasswordLabel: translate(locale, login.forgotPassword),
    createAccountLabel: translate(locale, login.createAccount),
  };
}
