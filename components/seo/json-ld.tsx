import { getAbsoluteUrl, getSiteUrl, siteIdentity } from "@/lib/seo/site-config";
import { siteSeoDefaults } from "@/content/seo/pages";

export function OrganizationJsonLd() {
  const siteUrl = getSiteUrl();

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteIdentity.name,
    url: siteUrl,
    description: siteSeoDefaults.description,
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteIdentity.legalName,
    url: siteUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
    </>
  );
}

export function WebPageJsonLd({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  const page = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: getAbsoluteUrl(path),
    isPartOf: {
      "@type": "WebSite",
      name: siteIdentity.name,
      url: getSiteUrl(),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(page) }}
    />
  );
}
