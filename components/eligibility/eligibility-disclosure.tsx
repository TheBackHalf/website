"use client";

import { getDictionary } from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type EligibilityDisclosureProps = {
  locale: Locale;
  className?: string;
};

export function EligibilityDisclosure({
  locale,
  className,
}: EligibilityDisclosureProps) {
  const copy = getDictionary(locale).eligibility;
  return (
    <p
      data-bh-eligibility-disclosure="true"
      className={
        className ??
        "mt-4 font-sans text-sm font-light leading-relaxed text-bh-muted"
      }
    >
      {copy.marketingDisclosure}
    </p>
  );
}
