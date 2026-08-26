"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { FormError, FormPanel } from "@/components/design-system";
import type { Locale } from "@/lib/i18n/config";
import { getNotEligiblePath } from "@/lib/eligibility/paths";

type AgeChoice = "yes" | "no" | "";

type AgeGateProps = {
  locale: Locale;
  next?: string;
  onEligible?: () => void;
};

function readChoiceFromForm(form: HTMLFormElement): AgeChoice {
  const value = new FormData(form).get("bh-age-eligible");
  if (value === "yes" || value === "no") {
    return value;
  }
  return "";
}

function clearRestoredRadios(form: HTMLFormElement | null) {
  if (!form) {
    return;
  }
  for (const input of form.querySelectorAll<HTMLInputElement>(
    'input[name="bh-age-eligible"]',
  )) {
    if (input.checked) {
      input.checked = false;
    }
  }
}

export function AgeGate({ locale, next, onEligible }: AgeGateProps) {
  const copy = getDictionary(locale).eligibility;
  const formRef = useRef<HTMLFormElement>(null);
  const userSelectedRef = useRef(false);
  const yesId = "bh-age-eligible-yes";
  const noId = "bh-age-eligible-no";
  const errorId = "bh-age-eligible-error";
  const [choice, setChoice] = useState<AgeChoice>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    if (userSelectedRef.current || choice !== "") {
      return;
    }
    clearRestoredRadios(formRef.current);

    function handlePageShow() {
      if (!userSelectedRef.current && choice === "") {
        clearRestoredRadios(formRef.current);
      }
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [choice]);

  function selectChoice(nextChoice: string) {
    if (nextChoice !== "yes" && nextChoice !== "no") {
      return;
    }
    userSelectedRef.current = true;
    setChoice(nextChoice);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formValue = readChoiceFromForm(event.currentTarget);
    const selected = userSelectedRef.current
      ? formValue || choice
      : choice;
    if (selected !== "yes" && selected !== "no") {
      clearRestoredRadios(event.currentTarget);
      setError(copy.required);
      return;
    }
    setChoice(selected);
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/eligibility/confirm", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          attestedAdult: selected === "yes",
          locale,
          next,
        }),
      });
      const result = (await response.json()) as {
        status?: string;
        redirect?: string;
        error?: string;
      };
      if (result.status === "ineligible") {
        window.location.assign(result.redirect || getNotEligiblePath(locale));
        return;
      }
      if (result.status === "eligible") {
        if (onEligible) {
          onEligible();
          return;
        }
        window.location.assign(result.redirect || next || "/");
        return;
      }
      setError(copy.confirmFailed);
    } catch {
      setError(copy.confirmFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormPanel>
      <form
        ref={formRef}
        noValidate
        autoComplete="off"
        onSubmit={(event) => void handleSubmit(event)}
        data-bh-age-gate="true"
        data-bh-age-choice={choice || "unset"}
        lang={locale === "es" ? "es" : "en"}
      >
        <h2 className="bh-heading text-2xl md:text-3xl">{copy.gateTitle}</h2>
        <p className="mt-4 font-sans text-sm font-light leading-relaxed text-bh-muted md:text-base">
          {copy.gateDescription}
        </p>
        <fieldset
          className="mt-8"
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        >
          <legend className="font-sans text-sm font-medium text-bh-ink">
            {copy.question}
          </legend>
          <div className="mt-4 space-y-3">
            <label
              htmlFor={yesId}
              className="bh-choice-row"
            >
              <input
                id={yesId}
                type="radio"
                name="bh-age-eligible"
                value="yes"
                autoComplete="off"
                checked={choice === "yes"}
                onChange={(event) => selectChoice(event.target.value)}
                onClick={() => selectChoice("yes")}
              />
              <span>{copy.yesLabel}</span>
            </label>
            <label
              htmlFor={noId}
              className="bh-choice-row"
            >
              <input
                id={noId}
                type="radio"
                name="bh-age-eligible"
                value="no"
                autoComplete="off"
                checked={choice === "no"}
                onChange={(event) => selectChoice(event.target.value)}
                onClick={() => selectChoice("no")}
              />
              <span>{copy.noLabel}</span>
            </label>
          </div>
        </fieldset>
        {error ? (
          <FormError id={errorId} className="mt-4">
            {error}
          </FormError>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="bh-cta mt-8 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting ? copy.confirmContinue : copy.confirm}
        </button>
      </form>
    </FormPanel>
  );
}
