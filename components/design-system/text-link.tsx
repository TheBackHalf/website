import Link from "next/link";
import { LocaleLink } from "@/components/i18n/locale-link";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type TextLinkBaseProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "utility" | "legal";
};

type TextLinkProps = TextLinkBaseProps &
  (
    | ({ href: string; locale?: never } & Omit<
        React.ComponentPropsWithoutRef<typeof Link>,
        "href" | "className"
      >)
    | ({ href: string; locale: Locale } & Omit<
        React.ComponentPropsWithoutRef<typeof LocaleLink>,
        "href" | "locale" | "className"
      >)
  );

const variantClasses = {
  default: "bh-text-link",
  utility: "bh-text-link bh-text-link-utility",
  legal: "bh-legal-link",
} as const;

export function TextLink({
  href,
  children,
  className,
  variant = "default",
  locale,
  ...props
}: TextLinkProps) {
  const classes = cn(variantClasses[variant], className);

  if (locale) {
    return (
      <LocaleLink href={href} locale={locale} className={classes} {...props}>
        {children}
      </LocaleLink>
    );
  }

  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
