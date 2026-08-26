import { redactPersistError } from "@/lib/fab-5/michelle-db";
import {
  AuthPersistenceError,
  isDuplicateEmailConstraint,
  isFilesystemPersistError,
} from "@/lib/auth/store/db";
import {
  GENERIC_REGISTRATION_ERROR,
  REGISTRATION_UNAVAILABLE_ERROR,
} from "@/lib/auth/validation";
import type { RegisterEmailResult } from "@/lib/auth/types";

export type RegistrationFailureKind =
  | "duplicate_email"
  | "persistence"
  | "unexpected";

export function classifyRegistrationFailure(error: unknown): RegistrationFailureKind {
  if (isDuplicateEmailConstraint(error)) {
    return "duplicate_email";
  }
  if (error instanceof AuthPersistenceError) {
    return "persistence";
  }
  if (isFilesystemPersistError(error)) {
    return "persistence";
  }
  if (error instanceof Error && error.message === "ARC_CODE_EXHAUSTED") {
    return "persistence";
  }
  return "unexpected";
}

export function registrationFailureResult(error: unknown): RegisterEmailResult {
  const kind = classifyRegistrationFailure(error);
  console.error("[auth] registration_failed", {
    kind,
    detail: redactPersistError(error),
  });
  if (kind === "duplicate_email") {
    return { status: "duplicate", field: "email" };
  }
  if (kind === "persistence") {
    return { status: "error", message: REGISTRATION_UNAVAILABLE_ERROR };
  }
  return { status: "error", message: GENERIC_REGISTRATION_ERROR };
}
