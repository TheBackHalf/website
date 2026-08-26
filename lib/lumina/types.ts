/** Row 75 — Lumina conversation interface types (no model/provider layer). */
/** Row 76 — memory records live alongside conversations in the same DB file. */

import type { LuminaMemoryRecord } from "@/lib/lumina/memory/types";

export type LuminaMessageRole = "user" | "assistant" | "system-ui";

export type LuminaCitationKind = "internal" | "external" | "citation";

export type LuminaCitation = {
  id: string;
  label: string;
  href: string;
  kind: LuminaCitationKind;
};

export type LuminaMessage = {
  id: string;
  conversationId: string;
  role: LuminaMessageRole;
  content: string;
  createdAt: string;
  citations?: LuminaCitation[];
};

export type LuminaConversation = {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messages: LuminaMessage[];
};

export type LuminaDatabase = {
  conversations: LuminaConversation[];
  memories: LuminaMemoryRecord[];
};

export type LuminaClientStatus = "idle" | "sending" | "error";

export type LuminaSendErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "invalid_input"
  | "not_found"
  | "send_failed"
  | "age_ineligible";

export type LuminaConversationView = {
  conversation: LuminaConversation;
};

export type LoadLuminaConversationResult =
  | { status: "ok"; conversation: LuminaConversation }
  | { status: "unauthenticated" }
  | { status: "error"; code: LuminaSendErrorCode };

export type SendLuminaMessageResult =
  | { status: "ok"; conversation: LuminaConversation }
  | { status: "unauthenticated" }
  | { status: "validation_error"; code: "invalid_input" }
  | { status: "forbidden"; code: "forbidden" | "age_ineligible" }
  | { status: "not_found"; code: "not_found" }
  | { status: "error"; code: LuminaSendErrorCode; conversation?: LuminaConversation };
