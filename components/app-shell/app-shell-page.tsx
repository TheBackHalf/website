import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type AppShellPageHeaderProps = {
  title: string;
  description?: ReactNode;
  className?: string;
};

export function AppShellPageHeader({
  title,
  description,
  className,
}: AppShellPageHeaderProps) {
  return (
    <header className={cn("bh-app-page-header", className)}>
      <h1 className="bh-app-page-title">{title}</h1>
      {description ? (
        <p className="bh-app-page-description">{description}</p>
      ) : null}
    </header>
  );
}

type AppShellPageProps = {
  locale: Locale;
  children: React.ReactNode;
  className?: string;
};

export function AppShellPage({ children, className }: AppShellPageProps) {
  return (
    <div className={cn("bh-app-page", className)}>
      {children}
    </div>
  );
}
