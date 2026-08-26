import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { cn } from "@/lib/utils";

type PendingMarkerVariant = "copy" | "legal" | "translation";

type PendingMarkerProps = {
  locale?: Locale;
  variant?: PendingMarkerVariant;
  onDark?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function PendingMarker({
  locale = "en",
  variant = "copy",
  onDark = false,
  className,
  children,
}: PendingMarkerProps) {
  const dictionary = getDictionary(locale);

  if (children) {
    return (
      <p
        className={cn(
          variant === "legal" ? "bh-legal-copy-pending" : "bh-copy-pending",
          onDark && variant !== "legal" && "bh-copy-pending-on-dark",
          className,
        )}
        role="status"
      >
        {children}
      </p>
    );
  }

  const label =
    variant === "legal"
      ? dictionary.common.legalCopyPending
      : variant === "translation"
        ? dictionary.common.translationPending
        : dictionary.common.copyPending;

  return (
    <p
      className={cn(
        variant === "legal" ? "bh-legal-copy-pending" : "bh-copy-pending",
        onDark && variant !== "legal" && "bh-copy-pending-on-dark",
        className,
      )}
      lang={locale === "es" ? "es" : "en"}
      role="status"
    >
      {label}
    </p>
  );
}
