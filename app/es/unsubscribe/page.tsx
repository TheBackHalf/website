import type { Metadata } from "next";
import { UnsubscribePageView } from "@/components/pages/unsubscribe-page-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preferencias de correo — The Back Half",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ token?: string; status?: string }>;
};

export default async function UnsubscribePageEs({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <UnsubscribePageView
      locale="es"
      token={params.token}
      status={params.status}
    />
  );
}
