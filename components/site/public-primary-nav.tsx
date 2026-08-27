"use client";

import { useEffect, useId, useState } from "react";
import { LocaleLink } from "@/components/i18n/locale-link";
import { navLinks } from "@/components/home/nav-links";
import { getDictionary, resolveNavLabel } from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type PublicPrimaryNavProps = {
  locale?: Locale;
  variant?: "dark" | "light";
};

export function PublicPrimaryNav({
  locale = "en",
  variant = "dark",
}: PublicPrimaryNavProps) {
  const [open, setOpen] = useState(false);
  const navId = useId();
  const drawerId = `${navId}-drawer`;
  const dictionary = getDictionary(locale);
  const openLabel = dictionary.appShell.openMenu;
  const closeLabel = dictionary.appShell.closeMenu;
  const isDark = variant === "dark";

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={cn("bh-public-nav", isDark && "bh-public-nav-dark")}>
      <nav aria-label="Primary" className="bh-public-nav-desktop">
        <ul className="bh-hero-nav-links" role="list">
          {navLinks.map(({ href, key }) => (
            <li key={key}>
              <LocaleLink
                href={href}
                locale={locale}
                className={isDark ? "bh-hero-nav-link" : "bh-site-header-link"}
              >
                {resolveNavLabel(locale, key)}
              </LocaleLink>
            </li>
          ))}
        </ul>
      </nav>

      <button
        type="button"
        className="bh-public-nav-toggle"
        aria-expanded={open}
        aria-controls={drawerId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="sr-only">{open ? closeLabel : openLabel}</span>
        <span aria-hidden="true" className="bh-public-nav-toggle-icon">
          {open ? "×" : "☰"}
        </span>
      </button>

      {open ? (
        <button
          type="button"
          className="bh-public-nav-backdrop"
          aria-label={closeLabel}
          onClick={() => setOpen(false)}
        />
      ) : null}

      <nav
        id={drawerId}
        aria-label="Primary"
        className={cn("bh-public-nav-drawer", open && "bh-public-nav-drawer-open")}
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <ul className="bh-public-nav-drawer-list" role="list">
          {navLinks.map(({ href, key }) => (
            <li key={key}>
              <LocaleLink
                href={href}
                locale={locale}
                className="bh-public-nav-drawer-link"
                onClick={() => setOpen(false)}
              >
                {resolveNavLabel(locale, key)}
              </LocaleLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
