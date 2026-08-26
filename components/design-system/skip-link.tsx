import { cn } from "@/lib/utils";

type SkipLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a href={href} className={cn("bh-skip-link", className)}>
      {children}
    </a>
  );
}
