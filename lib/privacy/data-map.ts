import dataMapJson from "@/ops/fab-5/privacy-data-map.json";
import type { PrivacyOwner } from "@/lib/privacy/catalog";

export type PrivacySystemRecord = {
  id: string;
  name: string;
  stores: string[];
  dataCategories?: string[];
  neverStored?: string[];
  owner: PrivacyOwner | string;
  supportingOwner?: PrivacyOwner | string;
  escalation: string;
  accessExport: string;
  correction: string;
  deletion: string;
  consentWithdrawal?: string;
  retentionClass: string;
  retainOnDeletionRequest: boolean;
  retainReason?: string;
  manualOperatorStep?: boolean;
};

export type PrivacyDataMap = {
  record: string;
  processOwner: { agent: string; title: string };
  routingOwner: { agent: string; title: string };
  systems: PrivacySystemRecord[];
};

export function getPrivacyDataMap(): PrivacyDataMap {
  return dataMapJson as PrivacyDataMap;
}

export function listPrivacySystems(): PrivacySystemRecord[] {
  return getPrivacyDataMap().systems;
}

export function systemById(id: string): PrivacySystemRecord | undefined {
  return listPrivacySystems().find((system) => system.id === id);
}
