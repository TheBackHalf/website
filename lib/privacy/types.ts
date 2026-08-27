import type { Locale } from "@/lib/i18n/config";
import type {
  PrivacyIdentityMethod,
  PrivacyIdentityStatus,
  PrivacyOwner,
  PrivacyRequestStatus,
  PrivacyRequestType,
  PrivacySource,
} from "@/lib/privacy/catalog";

export type PrivacyHistoryEntry = {
  at: string;
  actor: PrivacyOwner | "system" | "requester";
  type: string;
  note: string;
};

export type PrivacyAcknowledgment = {
  status: "sent" | "logged" | "failed" | "not_configured";
  at?: string;
  error?: string;
};

export type PrivacyIdentity = {
  status: PrivacyIdentityStatus;
  method: PrivacyIdentityMethod;
  tokenHash?: string;
  tokenExpiresAt?: string;
  verifiedAt?: string;
  verifiedEmail?: string;
  matchedUserId?: string;
  arcCodePresented?: boolean;
};

export type PrivacyCorrectionPayload = {
  firstName?: string;
  lastName?: string;
  timeZone?: string;
  locale?: Locale;
};

export type PrivacySystemAction = {
  systemId: string;
  action:
    | "exported"
    | "corrected"
    | "deleted"
    | "anonymized"
    | "unlinked"
    | "revoked"
    | "disabled"
    | "retained"
    | "hold"
    | "manual_follow_up"
    | "not_applicable"
    | "skipped";
  retainOnDeletionRequest?: boolean;
  reason?: string;
};

export type PrivacyFulfillment = {
  startedAt?: string;
  completedAt?: string;
  exportGenerated?: boolean;
  deletionConfirmed?: boolean;
  legalHoldBlocked?: boolean;
  systems: PrivacySystemAction[];
  notes?: string;
};

export type PrivacyRequest = {
  id: string;
  createdAt: string;
  updatedAt: string;
  requesterName: string;
  requesterEmail: string;
  type: PrivacyRequestType;
  subject: string;
  message: string;
  status: PrivacyRequestStatus;
  assignedOwner: PrivacyOwner;
  identity: PrivacyIdentity;
  acknowledgment: PrivacyAcknowledgment;
  acknowledgmentDueAt: string;
  fulfillmentDueAt?: string;
  slaState: "within" | "approaching" | "overdue" | "complete";
  correction?: PrivacyCorrectionPayload;
  fulfillment: PrivacyFulfillment;
  history: PrivacyHistoryEntry[];
  source: PrivacySource;
  supportTicketId?: string;
  locale: Locale;
  test?: boolean;
};

export type PrivacyDatabase = {
  requests: PrivacyRequest[];
  lastUpdatedAt: string;
};

export type PrivacyRequestFormData = {
  name: string;
  email: string;
  type: string;
  subject: string;
  message: string;
  locale: Locale;
  arcCode?: string;
  confirmDeletion?: boolean;
  firstName?: string;
  lastName?: string;
  timeZone?: string;
};

export type PrivacySubmitResult =
  | { status: "received"; requestId: string; identity: PrivacyIdentityStatus }
  | {
      status: "validation_error";
      errors: Partial<Record<keyof PrivacyRequestFormData, string>>;
    }
  | { status: "error" };

export type PrivacyExportPackage = {
  generatedAt: string;
  requestId: string;
  requesterEmail: string;
  matchedUserId?: string;
  systems: string[];
  account?: Record<string, unknown>;
  consents?: Array<Record<string, unknown>>;
  journey?: Record<string, unknown>;
  lumina?: Record<string, unknown>;
  billing?: Record<string, unknown>;
  analytics?: Array<Record<string, unknown>>;
  support?: Array<Record<string, unknown>>;
  privacyRequests?: Array<Record<string, unknown>>;
  omitted: string[];
};
