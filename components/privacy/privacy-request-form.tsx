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
import { privacyRequestPageCopy, privacyTypeLabel } from "@/lib/privacy/copy";
import {
  PRIVACY_MAILBOX_ADDRESS,
  PRIVACY_REQUEST_TYPES,
} from "@/lib/privacy/catalog";
import type { PrivacyRequestFormData } from "@/lib/privacy/types";
import type { Locale } from "@/lib/i18n/config";

function createEmptyForm(
  locale: Locale,
  defaults?: Partial<PrivacyRequestFormData>,
): PrivacyRequestFormData {
  return {
    name: defaults?.name ?? "",
    email: defaults?.email ?? "",
    type: defaults?.type ?? "",
    subject: defaults?.subject ?? "",
    message: defaults?.message ?? "",
    locale,
    arcCode: "",
    confirmDeletion: false,
    firstName: defaults?.firstName ?? "",
    lastName: defaults?.lastName ?? "",
    timeZone: defaults?.timeZone ?? "",
  };
}

type PrivacyRequestFormProps = {
  locale?: Locale;
  defaults?: Partial<PrivacyRequestFormData>;
  sessionVerified?: boolean;
};

export function PrivacyRequestForm({
  locale = "en",
  defaults,
  sessionVerified = false,
}: PrivacyRequestFormProps) {
  const copy = privacyRequestPageCopy(locale);
  const formId = useId();
  const [form, setForm] = useState<PrivacyRequestFormData>(() =>
    createEmptyForm(locale, defaults),
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof PrivacyRequestFormData, string>>
  >({});
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "received" | "validation_error" | "error"
  >("idle");
  const [requestId, setRequestId] = useState<string | null>(null);

  const nameId = `${formId}-name`;
  const emailId = `${formId}-email`;
  const typeId = `${formId}-type`;
  const subjectId = `${formId}-subject`;
  const messageId = `${formId}-message`;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitState === "submitting" || submitState === "received") return;
    setSubmitState("submitting");
    try {
      const payload: PrivacyRequestFormData = { ...form, locale };
      const response = await fetch("/api/privacy/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, sessionVerified }),
      });
      const result = (await response.json()) as {
        status?: string;
        requestId?: string;
        errors?: Partial<Record<keyof PrivacyRequestFormData, string>>;
      };
      if (result.status === "received" && result.requestId) {
        setRequestId(result.requestId);
        setErrors({});
        setSubmitState("received");
        return;
      }
      if (result.status === "validation_error") {
        setErrors(result.errors ?? {});
        setSubmitState("validation_error");
        return;
      }
      setSubmitState("error");
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <FormPanel>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <p className="font-sans text-sm font-light text-bh-muted">{copy.sensitive}</p>
        <p className="font-sans text-sm font-light text-bh-muted">{copy.identityNote}</p>
        <FormField>
          <FormLabel htmlFor={nameId}>Name</FormLabel>
          <FormInput
            id={nameId}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            autoComplete="name"
          />
          {errors.name ? <FormError>{errors.name}</FormError> : null}
        </FormField>
        <FormField>
          <FormLabel htmlFor={emailId}>Email</FormLabel>
          <FormInput
            id={emailId}
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            autoComplete="email"
          />
          {errors.email ? <FormError>{errors.email}</FormError> : null}
        </FormField>
        <FormField>
          <FormLabel htmlFor={typeId}>Request type</FormLabel>
          <FormSelect
            id={typeId}
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
          >
            <option value="">Select a request type</option>
            {PRIVACY_REQUEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {privacyTypeLabel(type, locale)}
              </option>
            ))}
          </FormSelect>
          {errors.type ? <FormError>{errors.type}</FormError> : null}
        </FormField>
        {form.type === "CORRECTION" ? (
          <>
            <FormField>
              <FormLabel htmlFor={`${formId}-first`}>Corrected first name</FormLabel>
              <FormInput
                id={`${formId}-first`}
                value={form.firstName ?? ""}
                onChange={(event) =>
                  setForm({ ...form, firstName: event.target.value })
                }
              />
            </FormField>
            <FormField>
              <FormLabel htmlFor={`${formId}-last`}>Corrected last name</FormLabel>
              <FormInput
                id={`${formId}-last`}
                value={form.lastName ?? ""}
                onChange={(event) =>
                  setForm({ ...form, lastName: event.target.value })
                }
              />
            </FormField>
          </>
        ) : null}
        <FormField>
          <FormLabel htmlFor={subjectId}>Subject</FormLabel>
          <FormInput
            id={subjectId}
            value={form.subject}
            onChange={(event) => setForm({ ...form, subject: event.target.value })}
          />
          {errors.subject ? <FormError>{errors.subject}</FormError> : null}
        </FormField>
        <FormField>
          <FormLabel htmlFor={messageId}>Message</FormLabel>
          <FormTextarea
            id={messageId}
            value={form.message}
            onChange={(event) => setForm({ ...form, message: event.target.value })}
            rows={6}
          />
          <FormHelper>{copy.fulfillmentNote}</FormHelper>
          {errors.message ? <FormError>{errors.message}</FormError> : null}
        </FormField>
        {form.type === "DELETION" ? (
          <FormField>
            <label className="flex items-start gap-3 font-sans text-sm">
              <input
                type="checkbox"
                checked={form.confirmDeletion === true}
                onChange={(event) =>
                  setForm({ ...form, confirmDeletion: event.target.checked })
                }
              />
              <span>{copy.deletionConfirm}</span>
            </label>
            {errors.confirmDeletion ? (
              <FormError>{errors.confirmDeletion}</FormError>
            ) : null}
          </FormField>
        ) : null}
        <button
          type="submit"
          className="bh-cta disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitState === "submitting" || submitState === "received"}
        >
          {copy.submit}
        </button>
        {submitState === "received" && requestId ? (
          <StatusNotice variant="success">
            <p>{copy.received}</p>
            <p>{copy.receivedDetail.replace("{requestId}", requestId)}</p>
          </StatusNotice>
        ) : null}
        {submitState === "error" ? (
          <StatusNotice variant="error">
            <p>
              We could not send your request. Write to {PRIVACY_MAILBOX_ADDRESS}.
            </p>
          </StatusNotice>
        ) : null}
      </form>
    </FormPanel>
  );
}
