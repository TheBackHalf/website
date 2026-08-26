"use client";

import { useEffect, useState } from "react";
import { AgeGate } from "@/components/eligibility/age-gate";
import type { Locale } from "@/lib/i18n/config";
import { getNotEligiblePath } from "@/lib/eligibility/paths";

type AgeGatedSectionProps = {
  locale: Locale;
  next?: string;
  children: React.ReactNode;
};

export function AgeGatedSection({
  locale,
  next,
  children,
}: AgeGatedSectionProps) {
  const [status, setStatus] = useState<
    "loading" | "unconfirmed" | "eligible" | "ineligible"
  >("loading");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/eligibility/status")
      .then((response) => response.json())
      .then((body: { status?: string }) => {
        if (cancelled) return;
        if (body.status === "eligible") {
          setStatus("eligible");
          return;
        }
        if (body.status === "ineligible") {
          window.location.assign(getNotEligiblePath(locale));
          setStatus("ineligible");
          return;
        }
        setStatus("unconfirmed");
      })
      .catch(() => {
        if (!cancelled) setStatus("unconfirmed");
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (status === "loading") {
    return (
      <p className="font-sans text-sm font-light text-bh-muted" aria-live="polite">
        {locale === "es" ? "Cargando…" : "Loading…"}
      </p>
    );
  }

  if (status !== "eligible") {
    return (
      <AgeGate
        locale={locale}
        next={next}
        onEligible={() => setStatus("eligible")}
      />
    );
  }

  return <div data-bh-age-eligible-form="true">{children}</div>;
}
