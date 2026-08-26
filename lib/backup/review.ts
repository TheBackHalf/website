import { existsSync, readFileSync } from "node:fs";
import type { IsolatedRestoreResult } from "@/lib/backup/types";
import type { ProductionFingerprint } from "@/lib/backup/fingerprint";
import type { PlatformBackupProbe } from "@/lib/backup/platform-backups";

export type Row62ReviewModel = {
  generatedAt: string;
  productionSystem: string;
  backupStatus: string;
  backupMethod: string;
  frequency: string;
  retentionWindow: string;
  latestRecoveryPoint: string;
  restore: IsolatedRestoreResult;
  platform: PlatformBackupProbe;
  production: {
    modifiedByRestore: "NO" | "YES";
    databaseHealthy: "PASS" | "FAIL";
    applicationHealthy: "PASS" | "FAIL";
    persistenceHealthy: "PASS" | "FAIL";
    fingerprintUnchanged: boolean;
  };
  security: {
    secretsDisplayed: false;
    dumpGitignored: boolean;
    dumpRemoved: boolean;
  };
  owners: {
    technical: string;
    operations: string;
  };
  recoveryProcedure: "READY" | "NOT READY";
  founderAttention: boolean;
  remainingRisks: string[];
  before: Pick<
    ProductionFingerprint,
    "walLevel" | "archiveMode" | "publicTableCount" | "analytics" | "authUsers" | "storageObjects"
  >;
};

export function loadRow62Evidence(): Row62ReviewModel | null {
  const file = "ops/fab-5/runs/row-62-backup-restore-validation.json";
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Row62ReviewModel;
  } catch {
    return null;
  }
}
