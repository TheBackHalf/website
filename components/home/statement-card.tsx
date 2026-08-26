import { cn } from "@/lib/utils";

type StatementCardProps = {
  children: React.ReactNode;
  className?: string;
  index?: number;
};

export function StatementCard({
  children,
  className,
  index = 0,
}: StatementCardProps) {
  return (
    <div
      className={cn("bh-card bh-card-hover bh-statement", className)}
      style={{ animationDelay: `${index * 140}ms` }}
    >
      <div className="bh-statement-rule" aria-hidden="true" />
      <p className="bh-statement-text">{children}</p>
    </div>
  );
}
