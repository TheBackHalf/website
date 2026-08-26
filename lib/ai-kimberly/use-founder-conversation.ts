"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { loadAiKimberlyConversationAction } from "@/lib/ai-kimberly/actions/load-conversation";
import { sendAiKimberlyMessageAction } from "@/lib/ai-kimberly/actions/send-message";
import type {
  AiKimberlyClientStatus,
  AiKimberlyConversation,
  AiKimberlyMessage,
  AiKimberlySendErrorCode,
} from "@/lib/ai-kimberly/types";
import type { Locale } from "@/lib/i18n/config";

export type UseFounderConversationResult = {
  conversationId: string | null;
  messages: AiKimberlyMessage[];
  isEmpty: boolean;
  isPending: boolean;
  status: AiKimberlyClientStatus;
  error: AiKimberlySendErrorCode | null;
  isLoadingInitial: boolean;
  send: (content: string) => void;
  retryLastFailed: () => void;
};

export function useFounderConversation(
  routeLocale: Locale = "en",
): UseFounderConversationResult {
  const [conversation, setConversation] =
    useState<AiKimberlyConversation | null>(null);
  const [error, setError] = useState<AiKimberlySendErrorCode | null>(null);
  const [status, setStatus] = useState<AiKimberlyClientStatus>("idle");
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isPending, startTransition] = useTransition();
  const pendingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await loadAiKimberlyConversationAction();
      if (cancelled) {
        return;
      }

      if (result.status === "ok") {
        setConversation(result.conversation);
        setError(null);
        setStatus("idle");
      } else if (result.status === "unauthenticated") {
        setError("unauthenticated");
        setStatus("error");
      } else {
        setError(result.code);
        setStatus("error");
      }
      setIsLoadingInitial(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const send = useCallback(
    (content: string) => {
      if (pendingRef.current || isPending || !conversation) {
        return;
      }

      const trimmed = content.trim();
      if (!trimmed) {
        return;
      }

      pendingRef.current = true;
      setError(null);
      setStatus("sending");

      startTransition(() => {
        void (async () => {
          try {
            const result = await sendAiKimberlyMessageAction({
              conversationId: conversation.id,
              content: trimmed,
              mode: "send",
              routeLocale,
            });

            if (result.status === "ok") {
              setConversation(result.conversation);
              setError(null);
              setStatus("idle");
              return;
            }

            if (result.status === "unauthenticated") {
              setError("unauthenticated");
              setStatus("error");
              return;
            }

            if (result.status === "error" && result.conversation) {
              setConversation(result.conversation);
            }

            setError(result.code);
            setStatus("error");
          } catch {
            setError("send_failed");
            setStatus("error");
          } finally {
            pendingRef.current = false;
          }
        })();
      });
    },
    [conversation, isPending, routeLocale],
  );

  const retryLastFailed = useCallback(() => {
    if (pendingRef.current || isPending || !conversation) {
      return;
    }

    pendingRef.current = true;
    setError(null);
    setStatus("sending");

    startTransition(() => {
      void (async () => {
        try {
          const result = await sendAiKimberlyMessageAction({
            conversationId: conversation.id,
            mode: "retry",
            routeLocale,
          });

          if (result.status === "ok") {
            setConversation(result.conversation);
            setError(null);
            setStatus("idle");
            return;
          }

          if (result.status === "unauthenticated") {
            setError("unauthenticated");
            setStatus("error");
            return;
          }

          if (result.status === "error" && result.conversation) {
            setConversation(result.conversation);
          }

          setError(result.code);
          setStatus("error");
        } catch {
          setError("send_failed");
          setStatus("error");
        } finally {
          pendingRef.current = false;
        }
      })();
    });
  }, [conversation, isPending, routeLocale]);

  const messages = conversation?.messages ?? [];

  return {
    conversationId: conversation?.id ?? null,
    messages,
    isEmpty: messages.length === 0,
    isPending: isPending || status === "sending",
    status,
    error,
    isLoadingInitial,
    send,
    retryLastFailed,
  };
}
