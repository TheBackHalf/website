"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SkipLink } from "@/components/design-system";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { AppAccountMenu } from "@/components/app-shell/app-account-menu";
import {
  AppShellMobileNav,
  AppShellMobileNavToggle,
  AppShellNav,
} from "@/components/app-shell/app-shell-nav";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import type { Locale } from "@/lib/i18n/config";

type AppShellLayoutProps = {
  locale: Locale;
  children: React.ReactNode;
};

/**
 * Authenticated Architect application shell layout.
 * Auth enforcement: Row 64 — lib/app-shell/integration-points.ts
 */
export function AppShellLayout({ locale, children }: AppShellLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const dictionary = getDictionary(locale).appShell;
  const homeHref = getLocalizedArchitectPath("dashboard", locale);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <div className="bh-app-shell min-h-dvh bg-bh-cream text-bh-ink">
      <SkipLink href="#architect-main">{dictionary.skipToApp}</SkipLink>

      <header className="bh-app-header">
        <div className="bh-app-header-inner">
          <div className="bh-app-header-start">
            <AppShellMobileNavToggle
              locale={locale}
              open={mobileOpen}
              onToggle={() => setMobileOpen((current) => !current)}
            />
            <Link href={homeHref} className="bh-app-header-brand">
              The Back Half
              <span className="bh-app-header-badge">{dictionary.appName}</span>
            </Link>
          </div>

          <div className="bh-app-header-end">
            <LanguageSwitcher variant="light" />
            <AppAccountMenu locale={locale} />
          </div>
        </div>
      </header>

      <AppShellMobileNav
        locale={locale}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="bh-app-body">
        <aside className="bh-app-sidebar" aria-label={dictionary.navLabel}>
          <AppShellNav locale={locale} variant="sidebar" />
        </aside>

        <main id="architect-main" className="bh-app-main">
          {children}
        </main>
      </div>
    </div>
  );
}
