import { LocaleLink } from "@/components/i18n/locale-link";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type CtaVariant = "primary" | "secondary" | "hero";

type CtaButtonProps = {
  href?: string;
  locale?: Locale;
  variant?: CtaVariant;
  className?: string;
  children: React.ReactNode;
  "data-bh-cta"?: string;
} & (
  | Omit<React.ComponentPropsWithoutRef<"a">, "href">
  | React.ComponentPropsWithoutRef<"button">
);

const variantClasses: Record<CtaVariant, string> = {
  primary: "bh-cta",
  secondary: "bh-cta bh-cta-secondary",
  hero: "bh-cta bh-hero-cta",
};

function inferCtaName(href?: string, explicit?: string): string | undefined {
  if (explicit) return explicit;
  if (!href) return undefined;
  if (href.includes("/register")) return "become_architect";
  if (href.includes("/journey")) return "journey_explore";
  if (href.includes("/checkout")) return "checkout";
  if (href.includes("/lumina")) return "lumina";
  if (href.startsWith("#")) return "journey_explore";
  return undefined;
}

export function CtaButton({
  href,
  locale,
  variant = "primary",
  className,
  children,
  ...props
}: CtaButtonProps) {
  const classes = cn(variantClasses[variant], className);
  const trackingProps = {
    "data-bh-cta": inferCtaName(
      href,
      (props as { "data-bh-cta"?: string })["data-bh-cta"],
    ),
  };

  if (href) {
    if (locale && !href.startsWith("http") && href !== "#") {
      return (
        <LocaleLink
          href={href}
          locale={locale}
          className={classes}
          {...trackingProps}
          {...(props as Omit<
            React.ComponentPropsWithoutRef<typeof LocaleLink>,
            "href" | "locale"
          >)}
        >
          {children}
        </LocaleLink>
      );
    }

    return (
      <a
        href={href}
        className={classes}
        {...trackingProps}
        {...(props as React.ComponentPropsWithoutRef<"a">)}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      {...trackingProps}
      {...(props as React.ComponentPropsWithoutRef<"button">)}
    >
      {children}
    </button>
  );
}
