export type ColumnDump = {
  name: string;
  udt: string;
  nullable: boolean;
  primaryKey: boolean;
};

export type TableDump = {
  name: string;
  columns: ColumnDump[];
  rowCount: number;
};

export type IsolatedRestoreResult = {
  ok: boolean;
  method: "logical_export_pglite_restore";
  source: "production_supabase_postgres_public_schema";
  destination: "isolated_pglite_in_memory";
  recoveryPoint: string;
  dumpPathUsed: boolean;
  dumpRemoved: boolean;
  restoreDurationMs: number;
  validationDurationMs: number;
  tablesRestored: number;
  restoredCounts: Record<string, number>;
  analyticsPresent: boolean;
  analyticsCount: number;
  analyticsNameCounts: Record<string, number>;
  schemaValid: boolean;
  criticalTablesPresent: string[];
  missingCriticalTables: string[];
  integrity: "PASS" | "FAIL";
  error?: string;
};
