"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateArchitectProfileAction } from "@/lib/account/actions/update-profile";
import type {
  ArchitectProfileView,
  ProfileFormData,
  ProfileValidationErrors,
} from "@/lib/account/profile";
import type { Locale } from "@/lib/i18n/config";

export function useArchitectProfile(initialProfile: ArchitectProfileView) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [form, setForm] = useState<ProfileFormData>({
    firstName: initialProfile.firstName,
    lastName: initialProfile.lastName,
    pronunciation: initialProfile.pronunciation,
    locale: initialProfile.locale,
    supportPreference: initialProfile.supportPreference,
    timeZone: initialProfile.timeZone,
  });
  const [errors, setErrors] = useState<ProfileValidationErrors>({});
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField<K extends keyof ProfileFormData>(
    key: K,
    value: ProfileFormData[K],
  ) {
    setSaved(false);
    setFormError(null);
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key] && !current.form) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      delete next.form;
      return next;
    });
  }

  function save() {
    setSaved(false);
    setFormError(null);
    startTransition(() => {
      void (async () => {
        const result = await updateArchitectProfileAction(form);

        if (result.status === "validation_error") {
          setErrors(result.errors);
          return;
        }

        if (result.status === "unauthorized") {
          router.replace(
            form.locale === "es" ? "/es/login?next=/es/architect/settings" : "/login?next=/architect/settings",
          );
          return;
        }

        if (result.status === "error") {
          setFormError(result.message);
          return;
        }

        setProfile(result.profile);
        setForm({
          firstName: result.profile.firstName,
          lastName: result.profile.lastName,
          pronunciation: result.profile.pronunciation,
          locale: result.profile.locale,
          supportPreference: result.profile.supportPreference,
          timeZone: result.profile.timeZone,
        });
        setErrors({});
        setSaved(true);

        if (result.redirectPath) {
          router.push(result.redirectPath);
          router.refresh();
          return;
        }

        router.refresh();
      })();
    });
  }

  return {
    profile,
    form,
    errors,
    saved,
    formError,
    isPending,
    updateField,
    save,
    uiLocale: form.locale as Locale,
  };
}
