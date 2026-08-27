import { headers } from "next/headers";
import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { ProductAnalyticsBeacon } from "@/components/analytics/product-analytics-beacon";
import { OrganizationJsonLd } from "@/components/seo/json-ld";
import { KeyboardInsets } from "@/components/ui/keyboard-insets";
import { createRootMetadata } from "@/lib/seo/metadata";
import { isLocale } from "@/lib/i18n/config";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

const display = Cormorant_Garamond({
  variable: "--font-bh-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const sans = Outfit({
  variable: "--font-bh-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const localeHeader = headerStore.get("x-bh-locale");
  const locale = localeHeader && isLocale(localeHeader) ? localeHeader : "en";
  return createRootMetadata(locale);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const localeHeader = headerStore.get("x-bh-locale");
  const htmlLang = localeHeader === "es" ? "es" : "en";

  return (
    <html
      lang={htmlLang}
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <OrganizationJsonLd />
        <ProductAnalyticsBeacon />
        <KeyboardInsets />
        {children}
      </body>
    </html>
  );
}
