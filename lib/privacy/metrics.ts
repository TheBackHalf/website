import {
  OPEN_PRIVACY_REQUEST_STATUSES,
  type PrivacyRequestType,
} from "@/lib/privacy/catalog";
import type { PrivacyRequest } from "@/lib/privacy/types";

export type PrivacyRightsMetrics = {
  total: number;
  open: number;
  identityPending: number;
  overdue: number;
  byType: Record<PrivacyRequestType, number>;
};

export function buildPrivacyMetrics(requests: PrivacyRequest[]): PrivacyRightsMetrics {
  const byType = {
    ACCESS: 0,
    CORRECTION: 0,
    DELETION: 0,
    EXPORT: 0,
    CONSENT_WITHDRAWAL: 0,
    INQUIRY: 0,
  } satisfies Record<PrivacyRequestType, number>;
  let open = 0;
  let identityPending = 0;
  let overdue = 0;
  for (const request of requests) {
    byType[request.type] += 1;
    if (OPEN_PRIVACY_REQUEST_STATUSES.includes(request.status)) open += 1;
    if (request.status === "IDENTITY_PENDING") identityPending += 1;
    if (request.slaState === "overdue") overdue += 1;
  }
  return {
    total: requests.length,
    open,
    identityPending,
    overdue,
    byType,
  };
}
