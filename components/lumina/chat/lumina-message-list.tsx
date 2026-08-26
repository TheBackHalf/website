import { LuminaMessage } from "@/components/lumina/chat/lumina-message";
import type { LuminaMessage as LuminaMessageModel } from "@/lib/lumina/types";
import type { Locale } from "@/lib/i18n/config";

type LuminaMessageListProps = {
  messages: LuminaMessageModel[];
  locale: Locale;
  architectLabel: string;
  luminaLabel: string;
  citationsLabel: string;
  externalLinkHint: string;
};

export function LuminaMessageList({
  messages,
  locale,
  architectLabel,
  luminaLabel,
  citationsLabel,
  externalLinkHint,
}: LuminaMessageListProps) {
  return (
    <div className="bh-lumina-chat-history" role="log" aria-relevant="additions">
      {messages.map((message) => (
        <LuminaMessage
          key={message.id}
          message={message}
          locale={locale}
          architectLabel={architectLabel}
          luminaLabel={luminaLabel}
          citationsLabel={citationsLabel}
          externalLinkHint={externalLinkHint}
        />
      ))}
    </div>
  );
}
