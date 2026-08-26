import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { cn } from "@/lib/utils";

type DownstreamPlaceholderProps = {
  title: string;
  integrationRow?: number | readonly number[];
  locale?: Locale;
  className?: string;
  children?: React.ReactNode;
};

export function DownstreamPlaceholder({
  title,
  integrationRow,
  locale = "en",
  className,
  children,
}: DownstreamPlaceholderProps) {
  const dictionary = getDictionary(locale).appShell;
  const rowLabel = formatRowLabel(integrationRow);

  return (
    <section
      className={cn("bh-app-placeholder", className)}
      aria-labelledby={`placeholder-${slugify(title)}`}
    >
      <h2 id={`placeholder-${slugify(title)}`} className="bh-app-placeholder-title">
        {title}
      </h2>
      <p className="bh-app-placeholder-status" role="status">
        {dictionary.downstreamPending}
      </p>
      {rowLabel ? (
        <p className="bh-app-placeholder-row">
          Integration point: {rowLabel}
        </p>
      ) : null}
      <p className="bh-app-placeholder-detail">{dictionary.downstreamDetail}</p>
      {children ? (
        <div className="bh-app-placeholder-body">{children}</div>
      ) : null}
    </section>
  );
}

type AppShellSlotProps = {
  label: string;
  locale?: Locale;
  integrationRow?: number | readonly number[];
  className?: string;
};

/** Empty insertion slot for downstream dashboard/settings functionality. */
export function AppShellSlot({
  label,
  locale = "en",
  integrationRow,
  className,
}: AppShellSlotProps) {
  const dictionary = getDictionary(locale).appShell;
  const rowLabel = formatRowLabel(integrationRow);

  return (
    <div className={cn("bh-app-slot", className)}>
      <h3 className="bh-app-slot-label">{label}</h3>
      <p className="bh-app-slot-pending" role="status">
        {dictionary.downstreamPending}
        {rowLabel ? ` · ${rowLabel}` : ""}
      </p>
    </div>
  );
}

function formatRowLabel(integrationRow?: number | readonly number[]) {
  if (!integrationRow) {
    return null;
  }

  return Array.isArray(integrationRow)
    ? `Rows ${integrationRow[0]}–${integrationRow[1]}`
    : `Row ${integrationRow}`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-");
}
