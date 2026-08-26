import type { Locale } from "@/lib/i18n/config";
import { PendingMarker } from "@/components/design-system/pending-marker";
import { cn } from "@/lib/utils";

type TranslationPendingProps = {
  locale: Locale;
  className?: string;
  onDark?: boolean;
};

export function TranslationPending({
  locale,
  className,
  onDark = false,
}: TranslationPendingProps) {
  return (
    <PendingMarker
      locale={locale}
      variant="translation"
      onDark={onDark}
      className={cn(className)}
    />
  );
}
