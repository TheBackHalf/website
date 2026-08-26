import { getAgeEligibilityLegalCopy } from "@/content/legal/age-eligibility";
import { getDictionary } from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type AgeEligibilityLegalNoticeProps = {
  slug: string;
  locale: Locale;
};

export function AgeEligibilityLegalNotice({
  slug,
  locale,
}: AgeEligibilityLegalNoticeProps) {
  const copy = getAgeEligibilityLegalCopy(slug, locale);
  if (!copy) {
    return null;
  }
  const heading = getDictionary(locale).eligibility.legalHeading;

  return (
    <section
      className="bh-legal-eligibility mb-12 border-b border-bh-purple/10 pb-10"
      data-bh-age-legal={slug}
      aria-labelledby="age-eligibility-heading"
    >
      <h2 id="age-eligibility-heading" className="bh-legal-section-heading">
        {copy.heading || heading}
      </h2>
      {copy.paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 48)} className="bh-legal-paragraph">
          {paragraph}
        </p>
      ))}
    </section>
  );
}
