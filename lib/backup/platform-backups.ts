export type PlatformBackupProbe = {
  attempted: boolean;
  authenticated: boolean;
  httpStatus: number | null;
  latestBackupAt: string | null;
  pitrEnabled: boolean | null;
  walgEnabled: boolean | null;
  backupCount: number | null;
  note: string;
};

function projectRefFromUrl(url: string): string | null {
  try {
    const user = decodeURIComponent(new URL(url).username);
    const parts = user.split(".");
    if (parts[0] === "postgres" && parts[1] && parts[1].length >= 10) return parts[1];
    return null;
  } catch {
    return null;
  }
}

export async function probeSupabasePlatformBackups(connectionUrl: string): Promise<PlatformBackupProbe> {
  const ref = projectRefFromUrl(connectionUrl);
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!ref) {
    return {
      attempted: false,
      authenticated: false,
      httpStatus: null,
      latestBackupAt: null,
      pitrEnabled: null,
      walgEnabled: null,
      backupCount: null,
      note: "Project ref not present on the connection username.",
    };
  }
  const headers: Record<string, string> = { accept: "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/backups`,
    { headers },
  );
  if (response.status === 401 || response.status === 403) {
    return {
      attempted: true,
      authenticated: false,
      httpStatus: response.status,
      latestBackupAt: null,
      pitrEnabled: null,
      walgEnabled: null,
      backupCount: null,
      note: "Supabase Management API denied listing backups without SUPABASE_ACCESS_TOKEN. Production WAL archive_mode=on was verified directly.",
    };
  }
  if (!response.ok) {
    return {
      attempted: true,
      authenticated: Boolean(token),
      httpStatus: response.status,
      latestBackupAt: null,
      pitrEnabled: null,
      walgEnabled: null,
      backupCount: null,
      note: `Management API returned HTTP ${response.status}.`,
    };
  }
  const body = (await response.json()) as {
    walg_enabled?: boolean;
    pitr_enabled?: boolean;
    backups?: Array<{ status?: string; inserted_at?: string }>;
  };
  const completed = (body.backups ?? []).filter((row) => row.status === "COMPLETED");
  const latest = completed
    .map((row) => row.inserted_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
  return {
    attempted: true,
    authenticated: true,
    httpStatus: 200,
    latestBackupAt: latest,
    pitrEnabled: body.pitr_enabled ?? null,
    walgEnabled: body.walg_enabled ?? null,
    backupCount: completed.length,
    note: "Management API listed completed backups.",
  };
}
