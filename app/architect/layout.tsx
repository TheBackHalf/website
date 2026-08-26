import { AppShellLayout } from "@/components/app-shell/app-shell-layout";

export default function ArchitectRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShellLayout locale="en">{children}</AppShellLayout>;
}
