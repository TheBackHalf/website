import type { Metadata } from "next";
import "@/styles/blueprint-print.css";

export const metadata: Metadata = {
  title: "The Back Half Blueprint",
  robots: { index: false, follow: false },
};

export default function BlueprintLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="bh-bp-production-root min-h-full bg-[var(--bh-pearl)] py-6">
      {children}
    </div>
  );
}
