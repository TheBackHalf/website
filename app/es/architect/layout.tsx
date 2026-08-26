import { AppShellLayout } from "@/components/app-shell/app-shell-layout";

export default function EsArchitectRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShellLayout locale="es">{children}</AppShellLayout>;
}
