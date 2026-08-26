import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { WebPageJsonLd } from "@/components/seo/json-ld";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import {
  getLegalDocumentBySlug,
  legalDocumentList,
} from "@/content/legal/documents";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";
import { getLocalizedPath, type LocalizedPath } from "@/lib/i18n/routing";

type LegalPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return legalDocumentList.map((document) => ({ slug: document.slug }));
}

export async function generateMetadata({
  params,
}: LegalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const meta = getDictionary("es").metadata.legal(slug);

  if (!meta) {
    return { title: "Legal — The Back Half" };
  }

  return createLocalizedPageMetadata({
    title: meta.title,
    description: meta.description,
    path: `/legal/${slug}` as LocalizedPath,
    locale: "es",
  });
}

export default async function EsLegalDocumentPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const document = getLegalDocumentBySlug(slug);
  const meta = getDictionary("es").metadata.legal(slug);

  if (!document || !meta) {
    notFound();
  }

  const path = getLocalizedPath(`/legal/${slug}` as LocalizedPath, "es");

  return (
    <>
      <WebPageJsonLd
        title={translate("es", meta.title)}
        description={translate("es", meta.description)}
        path={path}
      />
      <LegalPageShell document={document} locale="es" />
    </>
  );
}
