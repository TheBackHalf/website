"use client";

import { SupportRequestForm } from "@/components/support/support-request-form";
import { useState } from "react";

export function Row153ReviewForms() {
  const [locale, setLocale] = useState<"en" | "es">("en");

  return (
    <section className="mb-14" aria-labelledby="row153-forms">
      <h2
        id="row153-forms"
        className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink"
      >
        Support form — English and Spanish
      </h2>
      <div className="mb-6 flex gap-3">
        <button
          type="button"
          className={`rounded-sm border px-3 py-1 font-sans text-xs uppercase tracking-[0.14em] ${
            locale === "en"
              ? "border-bh-purple bg-bh-purple/10 text-bh-ink"
              : "border-bh-purple/20 text-bh-muted"
          }`}
          onClick={() => setLocale("en")}
        >
          English
        </button>
        <button
          type="button"
          className={`rounded-sm border px-3 py-1 font-sans text-xs uppercase tracking-[0.14em] ${
            locale === "es"
              ? "border-bh-purple bg-bh-purple/10 text-bh-ink"
              : "border-bh-purple/20 text-bh-muted"
          }`}
          onClick={() => setLocale("es")}
        >
          Español
        </button>
      </div>
      <div className="border border-bh-purple/15 bg-white px-4 py-6 sm:px-8">
        <SupportRequestForm locale={locale} />
      </div>
    </section>
  );
}
