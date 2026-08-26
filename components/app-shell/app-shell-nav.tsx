"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId } from "react";
import { architectNavItems } from "@/lib/app-shell/config";
import { getArchitectNavHref } from "@/lib/app-shell/routing";
import { resolveAppShellNavLabel } from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { getDictionary } from "@/content/i18n/get-dictionary";

type AppShellNavProps = {
  locale: Locale;
  className?: string;
  variant?: "sidebar" | "mobile";
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function AppShellNav({
  locale,
  className,
  variant = "sidebar",
  mobileOpen = false,
  onMobileClose,
}: AppShellNavProps) {
  const pathname = usePathname();
  const dictionary = getDictionary(locale).appShell;
  const navId = useId();

  const isMobile = variant === "mobile";

  useEffect(() => {
    if (!isMobile || !mobileOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onMobileClose?.();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobile, mobileOpen, onMobileClose]);

  const navClasses = cn(
    isMobile ? "bh-app-nav-mobile" : "bh-app-nav-sidebar",
    isMobile && mobileOpen && "bh-app-nav-mobile-open",
    className,
  );

  return (
    <nav
      id={isMobile ? "architect-mobile-nav" : `${navId}-sidebar`}
      aria-label={dictionary.navLabel}
      className={navClasses}
      {...(isMobile
        ? { "aria-hidden": !mobileOpen, ...(mobileOpen ? {} : { inert: true }) }
        : {})}
    >
      <ul className="bh-app-nav-list" role="list">
        {architectNavItems.map(({ key, href, external }) => {
          const localizedHref = getArchitectNavHref(href, locale);
          const isActive =
            !external &&
            (pathname === localizedHref ||
              pathname.startsWith(`${localizedHref}/`));

          return (
            <li key={key}>
              <Link
                href={localizedHref}
                className={cn(
                  "bh-app-nav-link",
                  isActive && "bh-app-nav-link-active",
                )}
                aria-current={isActive ? "page" : undefined}
                onClick={isMobile ? onMobileClose : undefined}
                {...(external ? { target: "_self" } : {})}
              >
                {resolveAppShellNavLabel(locale, key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type AppShellMobileNavToggleProps = {
  locale: Locale;
  open: boolean;
  onToggle: () => void;
};

export function AppShellMobileNavToggle({
  locale,
  open,
  onToggle,
}: AppShellMobileNavToggleProps) {
  const dictionary = getDictionary(locale).appShell;

  return (
    <button
      type="button"
      className="bh-app-mobile-toggle"
      aria-expanded={open}
      aria-controls="architect-mobile-nav"
      onClick={onToggle}
    >
      <span className="sr-only">
        {open ? dictionary.closeMenu : dictionary.openMenu}
      </span>
      <span aria-hidden="true" className="bh-app-mobile-toggle-icon">
        {open ? "×" : "☰"}
      </span>
    </button>
  );
}

export function AppShellMobileNav({
  locale,
  open,
  onClose,
}: {
  locale: Locale;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {open ? (
        <button
          type="button"
          className="bh-app-nav-backdrop"
          aria-label={getDictionary(locale).appShell.closeMenu}
          onClick={onClose}
        />
      ) : null}
      <AppShellNav
        locale={locale}
        variant="mobile"
        mobileOpen={open}
        onMobileClose={onClose}
      />
    </>
  );
}
