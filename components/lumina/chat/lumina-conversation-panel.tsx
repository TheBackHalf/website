"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { LuminaComposer } from "@/components/lumina/chat/lumina-composer";
import { LuminaMessageList } from "@/components/lumina/chat/lumina-message-list";
import { StatusNotice, TextLink } from "@/components/design-system";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import { luminaAsset } from "@/content/lumina";
import { getLuminaMemoryControlsAction } from "@/lib/lumina/memory/actions";
import { useLuminaConversation } from "@/lib/lumina/use-lumina-conversation";
import type { Locale } from "@/lib/i18n/config";

type LuminaConversationPanelProps = {
  locale: Locale;
  /** Row 84–87 — results/chapter CTA topic (safe query). */
  topic?: "aliveness" | "awakening" | "mirror" | "decision" | "standards" | "architect" | "expansion" | "beginning" | null;
};

export function LuminaConversationPanel({
  locale,
  topic = null,
}: LuminaConversationPanelProps) {
  const copy = getDictionary(locale).appShell.lumina;
  const {
    messages,
    isEmpty,
    isPending,
    status,
    error,
    isLoadingInitial,
    send,
    retryLastFailed,
  } = useLuminaConversation(locale);
  const [memoryEnabled, setMemoryEnabled] = useState<boolean | null>(null);
  const topicSentRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getLuminaMemoryControlsAction();
      if (cancelled || result.status !== "ok") {
        return;
      }
      setMemoryEnabled(result.controls.enabled);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      topic !== "aliveness" &&
      topic !== "awakening" &&
      topic !== "mirror" &&
      topic !== "decision" &&
      topic !== "standards" &&
      topic !== "architect" &&
      topic !== "expansion" &&
      topic !== "beginning"
    ) {
      return;
    }
    if (isLoadingInitial || isPending || topicSentRef.current) return;
    topicSentRef.current = true;
    const opener =
      topic === "beginning"
        ? locale === "es"
          ? "Quiero hablar sobre el Capítulo Siete — El Comienzo y mi Back Half Declaration."
          : "I want to discuss Chapter Seven — The Beginning and my Back Half Declaration."
        : topic === "expansion"
        ? locale === "es"
          ? "Quiero hablar sobre el Capítulo Seis — Expansión y mi Expansion Plan."
          : "I want to discuss Chapter Six — Expansion and my Expansion Plan."
        : topic === "architect"
        ? locale === "es"
          ? "Quiero hablar sobre el Capítulo Cinco — Convertirse en Architect y mi Architect Identity Statement."
          : "I want to discuss Chapter Five — Becoming the Architect and my Architect Identity Statement."
        : topic === "standards"
        ? locale === "es"
          ? "Quiero hablar sobre el Capítulo Cuatro — Los Estándares y mis Back Half Standards."
          : "I want to discuss Chapter Four — The Standards and my Back Half Standards."
        : topic === "decision"
        ? locale === "es"
          ? "Quiero hablar sobre el Capítulo Tres — La Decisión y mi Declaración de Decisión."
          : "I want to discuss Chapter Three — The Decision and my Decision Statement."
        : topic === "mirror"
          ? locale === "es"
            ? "Quiero hablar sobre el Capítulo Dos — El Espejo y El Espejo de The Back Half."
            : "I want to discuss Chapter Two — The Mirror and The Back Half Mirror."
          : topic === "awakening"
            ? locale === "es"
              ? "Quiero hablar sobre el Capítulo Uno — El Despertar y El Proyecto de Aliveness."
              : "I want to discuss Chapter One — The Awakening and The Aliveness Project."
            : locale === "es"
              ? "Quiero hablar sobre mi Aliveness Index y mis puntuaciones."
              : "I want to discuss my Aliveness Index and my scores.";
    send(opener);
  }, [topic, isLoadingInitial, isPending, locale, send]);

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
      {memoryEnabled !== null ? (
        <p className="bh-lumina-memory-indicator" aria-live="polite">
          {memoryEnabled ? copy.memoryActive : copy.memoryInactive}
        </p>
      ) : null}
      <div className="bh-lumina-chat-column">
        <div className="bh-lumina-chat-scroll" tabIndex={0}>
          {isLoadingInitial ? (
            <p className="bh-lumina-chat-empty-body">{copy.sending}</p>
          ) : isEmpty && status !== "sending" ? (
            <div className="bh-lumina-chat-empty">
              <div className="bh-lumina-chat-presence" aria-hidden="true">
                <Image
                  src={luminaAsset.heroImage}
                  alt=""
                  width={1024}
                  height={1536}
                  className="bh-lumina-chat-presence-image"
                  sizes="(max-width: 640px) min(78vw, 20rem), (max-width: 1024px) 18rem, 20rem"
                  priority
                />
              </div>
              <div className="bh-lumina-chat-empty-copy">
                <h2 className="bh-lumina-chat-empty-title">{copy.emptyTitle}</h2>
                <p className="bh-lumina-chat-empty-body">{copy.emptyBody}</p>
              </div>
            </div>
          ) : (
            <LuminaMessageList
              messages={messages}
              locale={locale}
              architectLabel={copy.architectLabel}
              luminaLabel={copy.luminaLabel}
              citationsLabel={copy.citationsLabel}
              externalLinkHint={copy.externalLinkHint}
            />
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
