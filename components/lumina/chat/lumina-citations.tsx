import { TextLink } from "@/components/design-system";
import type { LuminaCitation } from "@/lib/lumina/types";
import type { Locale } from "@/lib/i18n/config";

type LuminaCitationsProps = {
  citations?: LuminaCitation[];
  locale: Locale;
  label: string;
  externalLinkHint: string;
};

export function LuminaCitations({
  citations,
  locale,
  label,
  externalLinkHint,
}: LuminaCitationsProps) {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className="bh-lumina-chat-citations">
      <p className="bh-lumina-chat-citations-label">{label}</p>
      <ul className="bh-lumina-chat-citations-list">
        {citations.map((citation) => {
          const isExternal =
            citation.kind === "external" || /^https?:\/\//i.test(citation.href);

          if (isExternal) {
            return (
              <li key={citation.id}>
                <TextLink
                  href={citation.href}
                  className="bh-lumina-chat-citation-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${citation.label} (${externalLinkHint})`}
                >
                  {citation.label}
                </TextLink>
              </li>
            );
          }

          return (
            <li key={citation.id}>
              <TextLink
                href={citation.href}
                locale={locale}
                className="bh-lumina-chat-citation-link"
                aria-label={citation.label}
              >
                {citation.label}
              </TextLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
