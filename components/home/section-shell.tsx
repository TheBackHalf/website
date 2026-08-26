import { cn } from "@/lib/utils";

type SectionVariant = "light" | "muted" | "accent" | "dark" | "placeholder";

type SectionShellProps = {
  id: string;
  ariaLabel?: string;
  eyebrow?: string;
  eyebrowOnDark?: boolean;
  variant?: SectionVariant;
  align?: "center" | "left";
  density?: "default" | "compact";
  className?: string;
  eyebrowClassName?: string;
  containerClassName?: string;
  backdrop?: React.ReactNode;
  children?: React.ReactNode;
};

const variantClasses: Record<SectionVariant, string> = {
  light: "bh-section-light",
  muted: "bh-section-muted",
  accent: "bh-section-accent text-white",
  dark: "bh-section-dark text-white",
  placeholder: "bh-section-placeholder",
};

export function SectionShell({
  id,
  ariaLabel,
  eyebrow,
  eyebrowOnDark = false,
  variant = "light",
  align = "center",
  density = "default",
  className,
  eyebrowClassName,
  containerClassName,
  backdrop,
  children,
}: SectionShellProps) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={cn(
        "bh-section-shell relative scroll-mt-6 overflow-hidden px-5 sm:px-6 md:scroll-mt-8 md:px-10",
        density === "compact" ? "bh-section-compact" : "bh-section-default",
        variantClasses[variant],
        className,
      )}
    >
      {backdrop ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {backdrop}
        </div>
      ) : null}

      <div
        className={cn(
          "bh-reveal relative z-10 mx-auto w-full bh-content-width",
          align === "center" ? "text-center" : "text-left",
          containerClassName,
        )}
      >
        {eyebrow ? (
          <p
            className={cn(
              "bh-eyebrow",
              eyebrowOnDark && "bh-eyebrow-on-dark",
              eyebrowClassName,
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}

export function SectionHeading({
  children,
  className,
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return <Tag className={cn("bh-heading", className)}>{children}</Tag>;
}

export function SectionBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("bh-body", className)}>{children}</p>;
}

export type { SectionVariant };
