import type {
  LuminaClientStatus,
  LuminaConversation,
  LuminaMessage,
  LuminaSendErrorCode,
} from "@/lib/lumina/types";

/** Founder Conversation reuses the Lumina message shape; storage is isolated. */
export type AiKimberlyMessage = LuminaMessage;
export type AiKimberlyConversation = LuminaConversation;
export type AiKimberlyClientStatus = LuminaClientStatus;
export type AiKimberlySendErrorCode = LuminaSendErrorCode;

export type AiKimberlyDatabase = {
  conversations: AiKimberlyConversation[];
};

export type LoadAiKimberlyConversationResult =
  | { status: "ok"; conversation: AiKimberlyConversation }
  | { status: "unauthenticated" }
  | { status: "error"; code: AiKimberlySendErrorCode };

export type SendAiKimberlyMessageResult =
  | { status: "ok"; conversation: AiKimberlyConversation }
  | { status: "unauthenticated" }
  | { status: "validation_error"; code: "invalid_input" }
  | { status: "forbidden"; code: "forbidden" | "age_ineligible" }
  | { status: "not_found"; code: "not_found" }
  | {
      status: "error";
      code: AiKimberlySendErrorCode;
      conversation?: AiKimberlyConversation;
    };

export type SendAiKimberlyMessageInput = {
  conversationId: unknown;
  content?: unknown;
  mode?: unknown;
  routeLocale?: unknown;
};
