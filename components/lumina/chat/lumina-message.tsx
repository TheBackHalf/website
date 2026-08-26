import { LuminaCitations } from "@/components/lumina/chat/lumina-citations";
import { LuminaMessageBody } from "@/components/lumina/chat/lumina-message-body";
import type { LuminaMessage as LuminaMessageModel } from "@/lib/lumina/types";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type LuminaMessageProps = {
  message: LuminaMessageModel;
  locale: Locale;
  architectLabel: string;
  luminaLabel: string;
  citationsLabel: string;
  externalLinkHint: string;
};

export function LuminaMessage({
  message,
  locale,
  architectLabel,
  luminaLabel,
  citationsLabel,
  externalLinkHint,
}: LuminaMessageProps) {
  const isArchitect = message.role === "user";
  const isLumina = message.role === "assistant";
  const label = isArchitect ? architectLabel : luminaLabel;

  return (
    <article
      className={cn(
        "bh-lumina-chat-message",
        isArchitect && "bh-lumina-chat-message-architect",
        isLumina && "bh-lumina-chat-message-lumina",
        message.role === "system-ui" && "bh-lumina-chat-message-system",
      )}
      aria-label={label}
    >
      <p className="bh-lumina-chat-message-role">{label}</p>
      <LuminaMessageBody content={message.content} />
      <LuminaCitations
        citations={message.citations}
        locale={locale}
        label={citationsLabel}
        externalLinkHint={externalLinkHint}
      />
    </article>
  );
}
