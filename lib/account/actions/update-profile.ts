"use server";

import { cookies } from "next/headers";
import { getDictionary } from "@/content/i18n/get-dictionary";
import {
  isSupportPreference,
  toArchitectProfileView,
  type ProfileFormData,
  type UpdateProfileResult,
} from "@/lib/account/profile";
import { validateProfileForm } from "@/lib/account/validation";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import {
  AccessDeniedError,
  assertSameArchitectOrAdmin,
  requirePermission,
} from "@/lib/auth/access";
import {
  createSessionToken,
  getSessionCookieOptions,
} from "@/lib/auth/session";
import { getAuthStore } from "@/lib/auth/store";
import type { SupportPreference } from "@/lib/auth/types";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

type UpdateArchitectProfileInput = ProfileFormData & {
  role?: unknown;
  userId?: unknown;
  /**
   * @deprecated Name Pronunciation and Support Preference are removed from
   * user-facing Settings. Legacy stored values are preserved but never updated.
   */
  preserveSupportPreference?: boolean;
  preservePronunciation?: boolean;
};

export async function updateArchitectProfileAction(
  input: UpdateArchitectProfileInput,
): Promise<UpdateProfileResult> {
  try {
    const actor = await requirePermission("architect:profile:update_own");
    // Identity comes only from the authenticated session — ignore client userId.
    assertSameArchitectOrAdmin(actor, actor.sessionSub);

    const uiLocale: Locale = input.locale === "es" ? "es" : "en";
    const errors = validateProfileForm(input, uiLocale);

    if (Object.keys(errors).length > 0) {
      return { status: "validation_error", errors };
    }

    // Explicitly ignore any client-supplied role / userId properties.
    void input.role;
    void input.userId;
    void input.preserveSupportPreference;
    void input.preservePronunciation;
    void input.pronunciation;
    void input.supportPreference;

    const store = getAuthStore();
    const existing = actor.user;

    // Do not accept or overwrite Name Pronunciation / Support Preference.
    const supportPreference: SupportPreference | undefined =
      isSupportPreference(existing.supportPreference ?? "")
        ? existing.supportPreference
        : undefined;
    const pronunciation = existing.pronunciation ?? "";

    const updated = await store.updateUser(actor.sessionSub, {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      pronunciation,
      locale: uiLocale,
      ...(supportPreference ? { supportPreference } : {}),
      timeZone: input.timeZone.trim(),
    });

    if (!updated) {
      return {
        status: "error",
        message: getDictionary(uiLocale).appShell.settings.saveError,
      };
    }

    // Role must remain unchanged through profile mutations.
    if (updated.role !== existing.role) {
      return {
        status: "error",
        message: getDictionary(uiLocale).appShell.settings.saveError,
      };
    }

    const sessionToken = await createSessionToken(updated);
    const cookieStore = await cookies();
    cookieStore.set(
      getSessionCookieOptions().name,
      sessionToken,
      getSessionCookieOptions(),
    );
    cookieStore.set(LOCALE_COOKIE, uiLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    const redirectPath =
      updated.locale !== existing.locale
        ? getLocalizedArchitectPath("settings", updated.locale)
        : undefined;

    return {
      status: "success",
      redirectPath,
      profile: toArchitectProfileView(updated),
    };
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "unauthorized" };
    }
    throw error;
  }
}
