import Link from "next/link";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import { getLocalizedPath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";

type AccessDeniedViewProps = {
  locale: Locale;
};

export function AccessDeniedView({ locale }: AccessDeniedViewProps) {
  const copy = getDictionary(locale).access;

  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-2xl flex-col justify-center px-6 py-16 text-bh-ink">
      <h1 className="font-display text-4xl font-medium tracking-[-0.02em] md:text-5xl">
        {copy.deniedTitle}
      </h1>
      <p className="mt-4 font-sans text-base font-light leading-relaxed text-bh-muted md:text-lg">
        {copy.deniedDescription}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={getLocalizedArchitectPath("dashboard", locale)}
          className="bh-app-settings-save"
        >
          {copy.returnDashboard}
        </Link>
        <Link
          href={getLocalizedPath("/", locale)}
          className="bh-app-settings-link"
        >
          {copy.returnHome}
        </Link>
      </div>
    </main>
  );
}
