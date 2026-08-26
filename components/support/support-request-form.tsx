"use client";

import { useId, useState } from "react";
import {
  FormError,
  FormField,
  FormHelper,
  FormInput,
  FormLabel,
  FormPanel,
  FormSelect,
  FormTextarea,
  StatusNotice,
} from "@/components/design-system";
import {
  getDictionary,
  resolveFormLabel,
} from "@/content/i18n/get-dictionary";
import {
  SUPPORT_MAILBOX,
  supportCategoryOptions,
} from "@/lib/support/catalog";
import type { SupportRequestFormData } from "@/lib/support/types";
import type { Locale } from "@/lib/i18n/config";

function createEmptyForm(locale: Locale): SupportRequestFormData {
  return {
    name: "",
    email: "",
    category: "",
    subject: "",
    message: "",
    isArchitect: "",
    locale,
  };
}

type SupportRequestFormProps = {
  locale?: Locale;
};

export function SupportRequestForm({ locale = "en" }: SupportRequestFormProps) {
  const dictionary = getDictionary(locale);
  const forms = dictionary.forms;
  const formId = useId();
  const [form, setForm] = useState<SupportRequestFormData>(() =>
    createEmptyForm(locale),
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof SupportRequestFormData, string>>
  >({});
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "received" | "validation_error" | "error"
  >("idle");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const categoryOptions = supportCategoryOptions(locale);

  const nameId = `${formId}-name`;
  const emailId = `${formId}-email`;
  const categoryId = `${formId}-category`;
  const subjectId = `${formId}-subject`;
  const architectId = `${formId}-architect`;
  const messageId = `${formId}-message`;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitState === "submitting" || submitState === "received") return;
    setSubmitState("submitting");

    try {
      const payload: SupportRequestFormData = { ...form, locale };
      const response = await fetch("/api/support/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        status?: string;
        ticketId?: string;
        errors?: Partial<Record<keyof SupportRequestFormData, string>>;
      };

      if (result.status === "validation_error") {
        setErrors(result.errors ?? {});
        setSubmitState("validation_error");
        return;
      }

      if (result.status === "age_ineligible") {
        window.location.assign(locale === "es" ? "/es/not-eligible" : "/not-eligible");
        return;
      }

      if (result.status === "received" && result.ticketId) {
        setTicketId(result.ticketId);
        setSubmitState("received");
        return;
      }

      setSubmitState("error");
    } catch {
      setSubmitState("error");
    }
  }

  function updateField<K extends keyof SupportRequestFormData>(
    key: K,
    value: SupportRequestFormData[K],
  ) {
    if (submitState === "received") return;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (submitState === "validation_error" || submitState === "error") {
      setSubmitState("idle");
    }
  }

  const formLocked = submitState === "received";

  return (
    <form
      id="support-request-form"
      noValidate
      onSubmit={handleSubmit}
      className="mx-auto max-w-2xl text-left"
      aria-describedby={
        submitState === "received"
          ? "support-submit-received"
          : submitState === "error"
            ? "support-submit-error"
            : undefined
      }
      lang={locale === "es" ? "es" : "en"}
    >
      <input type="hidden" name="locale" value={locale} />

      <FormPanel>
        <FormHelper id={`${formId}-sensitive`}>{forms.sensitiveNotice}</FormHelper>

        <FormField>
          <FormLabel htmlFor={nameId}>{forms.name}</FormLabel>
          <FormInput
            id={nameId}
            name="name"
            type="text"
            autoComplete="name"
            required
            disabled={formLocked}
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
            hasError={Boolean(errors.name)}
          />
          {errors.name ? (
            <FormError id={`${nameId}-error`}>{errors.name}</FormError>
          ) : null}
        </FormField>

        <FormField>
          <FormLabel htmlFor={emailId}>{forms.email}</FormLabel>
          <FormInput
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={formLocked}
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${emailId}-error` : undefined}
            hasError={Boolean(errors.email)}
          />
          {errors.email ? (
            <FormError id={`${emailId}-error`}>{errors.email}</FormError>
          ) : null}
        </FormField>

        <FormField>
          <FormLabel htmlFor={categoryId}>{forms.reasonCategory}</FormLabel>
          <FormSelect
            id={categoryId}
            name="category"
            required
            disabled={formLocked}
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? `${categoryId}-error` : undefined}
            hasError={Boolean(errors.category)}
          >
            <option value="">
              {locale === "en" ? "Select a category" : "Selecciona una categoría"}
            </option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FormSelect>
          {errors.category ? (
            <FormError id={`${categoryId}-error`}>{errors.category}</FormError>
          ) : null}
        </FormField>

        <FormField>
          <FormLabel htmlFor={subjectId}>{forms.subject}</FormLabel>
          <FormInput
            id={subjectId}
            name="subject"
            type="text"
            required
            disabled={formLocked}
            value={form.subject}
            onChange={(event) => updateField("subject", event.target.value)}
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? `${subjectId}-error` : undefined}
            hasError={Boolean(errors.subject)}
          />
          {errors.subject ? (
            <FormError id={`${subjectId}-error`}>{errors.subject}</FormError>
          ) : null}
        </FormField>

        <FormField>
          <FormLabel htmlFor={architectId}>{forms.alreadyArchitect}</FormLabel>
          <FormSelect
            id={architectId}
            name="isArchitect"
            disabled={formLocked}
            value={form.isArchitect}
            onChange={(event) =>
              updateField(
                "isArchitect",
                event.target.value === "yes" || event.target.value === "no"
                  ? event.target.value
                  : "",
              )
            }
          >
            <option value="">
              {locale === "en" ? "Select" : "Selecciona"}
            </option>
            <option value="yes">{forms.architectYes}</option>
            <option value="no">{forms.architectNo}</option>
          </FormSelect>
        </FormField>

        <FormField>
          <FormLabel htmlFor={messageId}>{forms.message}</FormLabel>
          <FormTextarea
            id={messageId}
            name="message"
            required
            rows={6}
            disabled={formLocked}
            value={form.message}
            onChange={(event) => updateField("message", event.target.value)}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={
              errors.message ? `${messageId}-error` : `${formId}-sensitive`
            }
            hasError={Boolean(errors.message)}
          />
          {errors.message ? (
            <FormError id={`${messageId}-error`}>{errors.message}</FormError>
          ) : null}
        </FormField>

        <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={submitState === "submitting" || formLocked}
            className="bh-cta disabled:cursor-not-allowed disabled:opacity-60"
            aria-busy={submitState === "submitting"}
          >
            {submitState === "submitting"
              ? dictionary.common.submitting
              : resolveFormLabel(locale, "contactSubmit")}
          </button>
        </div>

        {submitState === "received" && ticketId ? (
          <StatusNotice id="support-submit-received" variant="success" className="mt-8">
            <p className="font-sans text-sm font-medium tracking-[0.08em] text-bh-ink">
              {forms.submissionReceived}
            </p>
            <p className="mt-2 font-sans text-sm font-light leading-relaxed text-bh-muted">
              {forms.submissionReceivedDetail.replace("{ticketId}", ticketId)}
            </p>
          </StatusNotice>
        ) : null}

        {submitState === "error" ? (
          <StatusNotice id="support-submit-error" variant="error" className="mt-8">
            <p className="font-sans text-sm font-medium tracking-[0.08em] text-bh-ink">
              {forms.submissionError}
            </p>
            <p className="mt-2 font-sans text-sm font-light leading-relaxed text-bh-muted">
              <a className="underline decoration-bh-purple/30" href={`mailto:${SUPPORT_MAILBOX}`}>
                {SUPPORT_MAILBOX}
              </a>
            </p>
          </StatusNotice>
        ) : null}
      </FormPanel>
    </form>
  );
}
