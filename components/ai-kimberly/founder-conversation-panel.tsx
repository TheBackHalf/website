"use client";

import { FounderConversationMedia } from "@/components/ai-kimberly/founder-conversation-media";
import { LuminaComposer } from "@/components/lumina/chat/lumina-composer";
import { LuminaMessageList } from "@/components/lumina/chat/lumina-message-list";
import { StatusNotice, TextLink } from "@/components/design-system";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import { useFounderConversation } from "@/lib/ai-kimberly/use-founder-conversation";
import type { Locale } from "@/lib/i18n/config";

type FounderConversationPanelProps = {
  locale: Locale;
};

export function FounderConversationPanel({
  locale,
}: FounderConversationPanelProps) {
  const copy = getDictionary(locale).appShell.aiKimberly;
  const {
    messages,
    isEmpty,
    isPending,
    status,
    error,
    isLoadingInitial,
    send,
    retryLastFailed,
  } = useFounderConversation(locale);

  const statusText =
    status === "sending"
      ? copy.responding
      : error
        ? copy.errorGeneric
        : "";

  return (
    <section
      className="bh-lumina-chat"
      aria-label={resolveAppShellLabel(locale, copy.title)}
    >
      <p className="bh-lumina-memory-indicator">{copy.identityNote}</p>
      <div className="bh-lumina-chat-column">
        <div className="bh-lumina-chat-scroll" tabIndex={0}>
          {isLoadingInitial ? (
            <p className="bh-lumina-chat-empty-body">{copy.sending}</p>
          ) : isEmpty && status !== "sending" ? (
            <div className="bh-lumina-chat-empty">
              <div className="bh-lumina-chat-presence">
                <FounderConversationMedia locale={locale} />
              </div>
              <div className="bh-lumina-chat-empty-copy">
                <h2 className="bh-lumina-chat-empty-title">{copy.emptyTitle}</h2>
                <p className="bh-lumina-chat-empty-body">{copy.emptyBody}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="bh-ai-kimberly-media-inline">
                <FounderConversationMedia locale={locale} />
              </div>
              <LuminaMessageList
                messages={messages}
                locale={locale}
                architectLabel={copy.architectLabel}
                luminaLabel={copy.founderLabel}
                citationsLabel={copy.citationsLabel}
                externalLinkHint={copy.externalLinkHint}
              />
            </>
          )}

          {status === "sending" ? (
            <p
              className="bh-lumina-chat-responding"
              aria-live="polite"
              aria-atomic="true"
            >
              {copy.responding}
            </p>
          ) : (
            <span className="sr-only" aria-live="polite" aria-atomic="true">
              {statusText}
            </span>
          )}

          {error ? (
            <div className="bh-lumina-chat-error">
              <StatusNotice variant="error">
                <p>{copy.errorGeneric}</p>
                <button
                  type="button"
                  className="bh-lumina-chat-retry"
                  onClick={retryLastFailed}
                  disabled={isPending}
                >
                  {copy.retry}
                </button>
              </StatusNotice>
            </div>
          ) : null}
        </div>

        <div className="bh-lumina-chat-composer-dock">
          <LuminaComposer
            label={copy.composerLabel}
            placeholder={copy.composerPlaceholder}
            sendLabel={copy.send}
            sendingLabel={copy.sending}
            disabled={isPending || isLoadingInitial}
            onSend={send}
          />
        </div>
      </div>

      <p className="bh-lumina-chat-disclosure">
        <TextLink
          href="/legal/ai-disclosure"
          locale={locale}
          variant="legal"
        >
          {copy.disclosureLink}
        </TextLink>
      </p>
    </section>
  );
}
