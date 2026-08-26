import type { ReactNode } from "react";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";
import { cn } from "@/lib/utils";

type PrintDocumentShellProps = {
  children: ReactNode;
  variant?: BlueprintPrintVariant;
  title: string;
  className?: string;
};

export function PrintDocumentShell({
  children,
  variant = "print",
  title,
  className,
}: PrintDocumentShellProps) {
  return (
    <div
      className={cn("bh-bp-document", className)}
      data-variant={variant}
      data-document={title}
      role="document"
      aria-label={title}
      lang="en"
    >
      <div className="bh-bp-screen-notice" aria-hidden="true">
        Blueprint print preview
      </div>
      {children}
    </div>
  );
}
