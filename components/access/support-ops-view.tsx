import { getDictionary } from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import { SupportLookupForm } from "@/components/access/support-lookup-form";

type SupportOpsViewProps = {
  locale: Locale;
};

export function SupportOpsView({ locale }: SupportOpsViewProps) {
  const copy = getDictionary(locale).access;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-bh-ink">
      <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
        {copy.supportTitle}
      </h1>
      <p className="mt-3 max-w-2xl font-sans text-base font-light text-bh-muted">
        {copy.supportDescription}
      </p>
      <p className="mt-4 font-sans text-sm">
        <a href="/ops/admin/support" className="underline decoration-bh-purple/30">
          {locale === "es" ? "Tickets de soporte" : "Support tickets"}
        </a>
      </p>
      <div className="bh-app-settings-section mt-8">
        <SupportLookupForm locale={locale} />
      </div>
    </main>
  );
}
