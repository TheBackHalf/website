"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  FormError,
  FormField,
  FormHelper,
  FormInput,
  FormLabel,
  FormSelect,
  StatusNotice,
} from "@/components/design-system";
import {
  getDictionary,
  resolveAppShellNavLabel,
} from "@/content/i18n/get-dictionary";
import { useArchitectProfile } from "@/lib/account/use-architect-profile";
import { LuminaMemoryControls } from "@/components/account/lumina-memory-controls";
import type {
  ArchitectProfileView,
  ConsentHistoryItem,
} from "@/lib/account/profile";
import { logoutAction } from "@/lib/auth/actions/logout";
import { roleLabelKey } from "@/lib/auth/roles";
import { getForgotPasswordPath } from "@/lib/auth/routing";
import { getArchitectNavHref } from "@/lib/app-shell/routing";
import type { LuminaMemoryControlsView } from "@/lib/lumina/memory/types";
import type { Locale } from "@/lib/i18n/config";

type ProfilePreferencesFormProps = {
  locale: Locale;
  profile: ArchitectProfileView;
  consents: ConsentHistoryItem[];
  timeZones: string[];
  memoryControls: LuminaMemoryControlsView | null;
};

function consentLabel(
  locale: Locale,
  consentType: ConsentHistoryItem["consentType"],
): string {
  const copy = getDictionary(locale).appShell.settings;
  switch (consentType) {
    case "terms_of_use":
      return copy.consentTerms;
    case "privacy_policy":
      return copy.consentPrivacy;
    case "participant_agreement":
      return copy.consentParticipant;
    case "ai_disclosure":
      return copy.consentAi;
    case "membership_agreement":
      return copy.consentMembership;
    case "billing_subscription":
      return copy.consentBilling;
    case "lumina_memory":
      return copy.consentLuminaMemory;
    default:
      return consentType;
  }
}

function formatConsentDate(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ProfilePreferencesForm({
  locale,
  profile,
  consents,
  timeZones,
  memoryControls,
}: ProfilePreferencesFormProps) {
  const {
    form,
    errors,
    saved,
    formError,
    isPending,
    updateField,
    save,
    profile: currentProfile,
  } = useArchitectProfile(profile);
  const copy = getDictionary(locale).appShell.settings;
  const [logoutPending, startLogout] = useTransition();

  return (
    <form
      className="bh-app-settings-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <section className="bh-app-settings-section" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="bh-app-settings-section-title">
          {copy.profile}
        </h2>
        <div className="bh-app-settings-grid">
          <FormField>
            <FormLabel htmlFor="profile-first-name">{copy.firstName}</FormLabel>
            <FormInput
              id="profile-first-name"
              name="firstName"
              autoComplete="given-name"
              value={form.firstName}
              hasError={Boolean(errors.firstName)}
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={errors.firstName ? "profile-first-name-error" : undefined}
              onChange={(event) => updateField("firstName", event.target.value)}
            />
            {errors.firstName ? (
              <FormError id="profile-first-name-error">{errors.firstName}</FormError>
            ) : null}
          </FormField>

          <FormField>
            <FormLabel htmlFor="profile-last-name">{copy.lastName}</FormLabel>
            <FormInput
              id="profile-last-name"
              name="lastName"
              autoComplete="family-name"
              value={form.lastName}
              hasError={Boolean(errors.lastName)}
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={errors.lastName ? "profile-last-name-error" : undefined}
              onChange={(event) => updateField("lastName", event.target.value)}
            />
            {errors.lastName ? (
              <FormError id="profile-last-name-error">{errors.lastName}</FormError>
            ) : null}
          </FormField>
        </div>
      </section>

      <section
        className="bh-app-settings-section"
        aria-labelledby="preferences-heading"
      >
        <h2 id="preferences-heading" className="bh-app-settings-section-title">
          {copy.preferences}
        </h2>
        <div className="bh-app-settings-grid">
          <FormField>
            <FormLabel htmlFor="profile-language">{copy.language}</FormLabel>
            <FormSelect
              id="profile-language"
              name="locale"
              value={form.locale}
              hasError={Boolean(errors.locale)}
              aria-invalid={Boolean(errors.locale)}
              aria-describedby="profile-language-help profile-language-error"
              onChange={(event) =>
                updateField(
                  "locale",
                  event.target.value === "es" ? "es" : "en",
                )
              }
            >
              <option value="en">{copy.languageEnglish}</option>
              <option value="es">{copy.languageSpanish}</option>
            </FormSelect>
            <FormHelper id="profile-language-help">{copy.languageHelper}</FormHelper>
            {errors.locale ? (
              <FormError id="profile-language-error">{errors.locale}</FormError>
            ) : null}
          </FormField>

          <FormField className="bh-app-settings-span-2">
            <FormLabel htmlFor="profile-timezone">{copy.timeZone}</FormLabel>
            <FormSelect
              id="profile-timezone"
              name="timeZone"
              value={form.timeZone}
              hasError={Boolean(errors.timeZone)}
              aria-invalid={Boolean(errors.timeZone)}
              aria-describedby="profile-timezone-help profile-timezone-error"
              onChange={(event) => updateField("timeZone", event.target.value)}
            >
              <option value="">{copy.timeZonePlaceholder}</option>
              {timeZones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </FormSelect>
            <FormHelper id="profile-timezone-help">{copy.timeZoneHelper}</FormHelper>
            {errors.timeZone ? (
              <FormError id="profile-timezone-error">{errors.timeZone}</FormError>
            ) : null}
          </FormField>
        </div>
      </section>

      <div className="bh-app-settings-actions">
        <button
          type="submit"
          className="bh-app-settings-save"
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? copy.saving : copy.save}
        </button>
      </div>

      {saved ? (
        <StatusNotice variant="success" id="profile-save-success">
          <p>{copy.saved}</p>
        </StatusNotice>
      ) : null}
      {formError ? (
        <StatusNotice variant="error" id="profile-save-error">
          <p>{formError}</p>
        </StatusNotice>
      ) : null}

      {memoryControls ? (
        <LuminaMemoryControls locale={locale} initialControls={memoryControls} />
      ) : null}

      <section
        className="bh-app-settings-section"
        aria-labelledby="consent-history-heading"
      >
        <h2 id="consent-history-heading" className="bh-app-settings-section-title">
          {copy.consentHistory}
        </h2>
        <p className="bh-app-settings-note">{copy.consentReadOnlyNote}</p>
        {consents.length === 0 ? (
          <p className="bh-app-settings-empty">{copy.consentEmpty}</p>
        ) : (
          <div className="bh-app-consent-table-wrap">
            <table className="bh-app-consent-table">
              <thead>
                <tr>
                  <th scope="col">{copy.consentType}</th>
                  <th scope="col">{copy.consentStatus}</th>
                  <th scope="col">{copy.consentAcceptedAt}</th>
                  <th scope="col">{copy.consentVersion}</th>
                </tr>
              </thead>
              <tbody>
                {consents.map((record) => (
                  <tr
                    key={`${record.consentType}-${record.documentId}-${record.consentedAt}`}
                  >
                    <td>{consentLabel(locale, record.consentType)}</td>
                    <td>{copy.consentAccepted}</td>
                    <td>{formatConsentDate(record.consentedAt, locale)}</td>
                    <td>
                      {record.documentVersion ?? copy.consentVersionUnavailable}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        className="bh-app-settings-section"
        aria-labelledby="account-controls-heading"
      >
        <h2 id="account-controls-heading" className="bh-app-settings-section-title">
          {copy.accountControls}
        </h2>
        <dl className="bh-app-account-details">
          <div>
            <dt>{copy.accountEmail}</dt>
            <dd>{currentProfile.email}</dd>
          </div>
          <div>
            <dt>{copy.accountRole}</dt>
            <dd>{copy[roleLabelKey(currentProfile.role)]}</dd>
          </div>
          <div>
            <dt>{copy.accountProvider}</dt>
            <dd>
              {currentProfile.authProvider === "google"
                ? copy.accountProviderGoogle
                : copy.accountProviderEmail}
            </dd>
          </div>
          <div>
            <dt>{copy.accountArcCode}</dt>
            <dd>
              <code>{currentProfile.arcCode}</code>
            </dd>
          </div>
          <div>
            <dt>{copy.accountProviderGoogle}</dt>
            <dd>
              {currentProfile.googleLinked
                ? copy.googleLinked
                : copy.googleNotLinked}
            </dd>
          </div>
        </dl>

        <ul className="bh-app-account-controls">
          <li>
            <Link
              href={getArchitectNavHref("/architect/billing", locale)}
              className="bh-app-settings-link"
            >
              {resolveAppShellNavLabel(locale, "billing")}
            </Link>
          </li>
          {currentProfile.hasPassword ? (
            <li>
              <Link
                href={getForgotPasswordPath(locale)}
                className="bh-app-settings-link"
              >
                {copy.resetPasswordLink}
              </Link>
            </li>
          ) : null}
          <li>
            <Link
              href={getArchitectNavHref("/support", locale)}
              className="bh-app-settings-link"
            >
              {copy.supportChannelSupport}
            </Link>
          </li>
          <li>
            <button
              type="button"
              className="bh-app-settings-link-button"
              disabled={logoutPending}
              aria-busy={logoutPending}
              onClick={() => {
                startLogout(() => {
                  void logoutAction(locale);
                });
              }}
            >
              {logoutPending
                ? getDictionary(locale).appShell.logoutPending
                : copy.signOut}
            </button>
          </li>
        </ul>

        <StatusNotice variant="pending" className="mt-6">
          <p>{copy.accountDeletionUnavailable}</p>
          <p className="mt-2">
            <Link href={locale === "es" ? "/es/privacy/request" : "/privacy/request"} className="bh-app-settings-link">
              {locale === "es" ? "Solicitud de derechos de privacidad" : "Privacy rights request"}
            </Link>
          </p>
        </StatusNotice>
      </section>
    </form>
  );
}
