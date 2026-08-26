import type { Locale } from "@/lib/i18n/config";
import { PendingMarker } from "@/components/design-system/pending-marker";

type CopyPendingProps = {
  className?: string;
  onDark?: boolean;
  locale?: Locale;
};

/** Matches homepage pending-copy pattern — no invented brand text. */
export function CopyPending({
  className,
  onDark = false,
  locale = "en",
}: CopyPendingProps) {
  return (
    <PendingMarker
      locale={locale}
      variant="copy"
      onDark={onDark}
      className={className}
    />
  );
}
