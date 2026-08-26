"use client";

import { useState, useTransition } from "react";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { logoutAction } from "@/lib/auth/actions/logout";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type AppAccountMenuProps = {
  locale: Locale;
  className?: string;
};

/**
 * Account / logout placement — Row 64 session integration point.
 * @see lib/app-shell/integration-points.ts → session.logoutAction
 */
export function AppAccountMenu({ locale, className }: AppAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dictionary = getDictionary(locale).appShell;
  const menuId = "architect-account-menu";

  return (
    <div className={cn("bh-app-account", className)}>
      <button
        type="button"
        className="bh-app-account-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="bh-app-account-avatar" aria-hidden="true">
          A
        </span>
        <span className="sr-only">{dictionary.accountMenuLabel}</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="bh-app-account-menu"
          aria-label={dictionary.accountMenuLabel}
        >
          <p className="bh-app-account-menu-heading">{dictionary.appName}</p>
          <button
            type="button"
            role="menuitem"
            className="bh-app-account-menu-item"
            disabled={isPending}
            aria-busy={isPending}
            onClick={() => {
              startTransition(() => {
                void logoutAction(locale);
              });
            }}
          >
            {isPending ? dictionary.logoutPending : dictionary.logout}
          </button>
        </div>
      ) : null}
    </div>
  );
}
