import type {
  VoiceOfArchitectCategory,
  VoiceOfArchitectOwner,
  VoiceOfArchitectRoute,
  VoiceOfArchitectSource,
  VoiceOfArchitectStatus,
} from "@/lib/voice-of-architect/catalog";
import type { SupportPriority, SupportTicketCategory } from "@/lib/support/catalog";

export type VoiceOfArchitectClassification = {
  category: VoiceOfArchitectCategory;
  secondary: VoiceOfArchitectCategory[];
  route: VoiceOfArchitectRoute;
  owner: VoiceOfArchitectOwner;
  coordinator: VoiceOfArchitectOwner;
  criticalDefect: boolean;
  immediate: boolean;
  reason: string;
};

export type VoiceOfArchitectRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  timezone: "America/New_York";
  category: VoiceOfArchitectCategory;
  secondary: VoiceOfArchitectCategory[];
  source: VoiceOfArchitectSource;
  sourceRef?: string;
  summary: string;
  route: VoiceOfArchitectRoute;
  owner: VoiceOfArchitectOwner;
  coordinator: VoiceOfArchitectOwner;
  status: VoiceOfArchitectStatus;
  criticalDefect: boolean;
  immediate: boolean;
  supportTicketId?: string;
  supportCategory?: SupportTicketCategory;
  supportPriority?: SupportPriority;
  analyticsEventName?: string;
  launchRiskRequired: boolean;
  testimonialPublishAllowed: boolean;
  addLaunchScope: boolean;
  fingerprint: string;
  test?: boolean;
};

export type VoiceOfArchitectDatabase = {
  store: string;
  protocol: string;
  rule: string;
  launchDay: string;
  timezone: "America/New_York";
  requiredFields: string[];
  lastUpdatedAt: string;
  entries: VoiceOfArchitectRecord[];
};

export type VoiceOfArchitectCaptureInput = {
  source: VoiceOfArchitectSource;
  sourceRef?: string;
  subject?: string;
  message?: string;
  summary?: string;
  supportTicketId?: string;
  supportCategory?: SupportTicketCategory;
  supportPriority?: SupportPriority;
  analyticsEventName?: string;
  test?: boolean;
  createdAt?: string;
};

export type VoiceOfArchitectThemeRollup = {
  category: VoiceOfArchitectCategory;
  count: number;
  criticalCount: number;
  immediateCount: number;
};
