/**
 * Row 20 capability probe. Prints names, presence, and pass/fail only.
 * Never prints secret values.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SECRET_NAME =
  /^(AUTH_SECRET|GOOGLE_CLIENT_SECRET|SMTP_PASSWORD|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|BLUEPRINT_PRINT_SECRET|OPENAI_API_KEY|VERCEL_TOKEN|SUPABASE_.*KEY|SUPABASE_SERVICE_ROLE.*)$/i;

function redact(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted-openai-key]")
    .replace(/sk_live_[A-Za-z0-9]+/g, "[redacted-stripe-live]")
    .replace(/sk_test_[A-Za-z0-9]+/g, "[redacted-stripe-test]")
    .replace(/whsec_[A-Za-z0-9]+/g, "[redacted-webhook]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

function parseEnvNames(filePath: string): Array<{ name: string; present: boolean; kind: string }> {
  if (!existsSync(filePath)) return [];
  const out: Array<{ name: string; present: boolean; kind: string }> = [];
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const name = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    let kind = "other";
    if (/^sk_test_/.test(value)) kind = "stripe_test_prefix";
    else if (/^sk_live_/.test(value)) kind = "stripe_live_prefix";
    else if (/^whsec_/.test(value)) kind = "stripe_webhook_prefix";
    else if (/^sk-/.test(value)) kind = "openai_prefix";
    out.push({ name, present: value.length > 0, kind: value.length > 0 ? kind : "empty" });
  }
  return out;
}

async function fetchStatus(
  label: string,
  url: string,
  headers: Record<string, string>,
): Promise<{ label: string; ok: boolean; status: number; note: string }> {
  try {
    const res = await fetch(url, { headers });
    return {
      label,
      ok: res.ok,
      status: res.status,
      note: res.ok ? "authenticated_read" : `http_${res.status}`,
    };
  } catch (error) {
    return {
      label,
      ok: false,
      status: 0,
      note: redact(error instanceof Error ? error.message : "fetch_failed"),
    };
  }
}

function cmd(command: string, args: string[]): { ok: boolean; note: string } {
  const result = spawnSync(command, args, { encoding: "utf8", shell: true, timeout: 20000 });
  const combined = redact(`${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim());
  if (result.status === 0) {
    return { ok: true, note: combined.split(/\r?\n/)[0]?.slice(0, 160) || "ok" };
  }
  return { ok: false, note: combined.slice(0, 200) || `exit_${result.status}` };
}

async function main(): Promise<void> {
  const root = process.cwd();
  const envPath = path.join(root, ".env.local");
  const envNames = parseEnvNames(envPath);
  const envMap = Object.fromEntries(envNames.map((item) => [item.name, item]));

  const loadEnv = (name: string): string | undefined => {
    if (!existsSync(envPath)) return process.env[name];
    if (process.env[name]) return process.env[name];
    for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      if (line.slice(0, eq).trim() !== name) continue;
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return value || undefined;
    }
    return undefined;
  };

  const openaiKey = loadEnv("OPENAI_API_KEY");
  const stripeKey = loadEnv("STRIPE_SECRET_KEY");
  const vercelToken = loadEnv("VERCEL_TOKEN") || process.env.VERCEL_TOKEN;
  const supabaseUrl = loadEnv("SUPABASE_URL") || loadEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnon = loadEnv("SUPABASE_ANON_KEY") || loadEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const googleClientId = loadEnv("GOOGLE_CLIENT_ID");
  const smtpUser = loadEnv("SMTP_USER");
  const smtpHost = loadEnv("SMTP_HOST");
  const smtpPass = loadEnv("SMTP_PASSWORD");

  const probes: Array<Record<string, unknown>> = [];

  probes.push({
    system: "env_local",
    ok: existsSync(envPath),
    namesPresent: envNames.filter((item) => item.present).map((item) => item.name),
    namesEmpty: envNames.filter((item) => !item.present).map((item) => item.name),
    kinds: envNames
      .filter((item) => item.present)
      .map((item) => ({ name: item.name, kind: item.kind })),
    secretNamesListedOnly: envNames.filter((item) => SECRET_NAME.test(item.name)).map((item) => item.name),
  });

  if (openaiKey) {
    probes.push(
      await fetchStatus("openai_models", "https://api.openai.com/v1/models", {
        Authorization: `Bearer ${openaiKey}`,
      }),
    );
  } else {
    probes.push({ label: "openai_models", ok: false, note: "key_absent" });
  }

  if (stripeKey) {
    probes.push(
      await fetchStatus("stripe_balance", "https://api.stripe.com/v1/balance", {
        Authorization: `Bearer ${stripeKey}`,
      }),
    );
  } else {
    probes.push({ label: "stripe_balance", ok: false, note: "key_absent" });
  }

  if (vercelToken) {
    probes.push(
      await fetchStatus("vercel_user", "https://api.vercel.com/v2/user", {
        Authorization: `Bearer ${vercelToken}`,
      }),
    );
  } else {
    probes.push({ label: "vercel_user", ok: false, note: "token_absent" });
  }

  probes.push({ label: "vercel_cli", ...cmd("npx", ["--yes", "vercel", "whoami", "--no-color"]) });
  probes.push({ label: "git_remote", ...cmd("git", ["remote", "-v"]) });
  probes.push({ label: "git_status", ...cmd("git", ["status", "-sb"]) });

  const vercelDir = path.join(root, ".vercel");
  probes.push({
    label: "vercel_project_dir",
    ok: existsSync(vercelDir),
    note: existsSync(vercelDir) ? "dot_vercel_present" : "dot_vercel_absent",
  });

  probes.push({
    label: "supabase_env",
    ok: Boolean(supabaseUrl && supabaseAnon),
    note: supabaseUrl ? "url_present" : "url_absent",
    anonPresent: Boolean(supabaseAnon),
  });

  probes.push({
    label: "google_oauth_client",
    ok: Boolean(googleClientId),
    note: googleClientId ? "client_id_present" : "client_id_absent",
  });

  probes.push({
    label: "smtp_config",
    ok: Boolean(smtpHost && smtpUser && smtpPass),
    hostPresent: Boolean(smtpHost),
    userPresent: Boolean(smtpUser),
    passwordPresent: Boolean(smtpPass),
  });

  probes.push({
    label: "data_dir",
    ok: existsSync(path.join(root, ".data")),
    note: existsSync(path.join(root, ".data")) ? "local_file_store_present" : "absent",
  });

  const libExists = [
    "lib/fab-5",
    "content/legal/documents.ts",
    "content/journey",
    "ops/fab-5/launch-rows.json",
    "ops/fab-5/operating-system.json",
  ].map((rel) => ({ path: rel, ok: existsSync(path.join(root, rel)) }));
  probes.push({ label: "source_paths", ok: libExists.every((item) => item.ok), paths: libExists });

  console.log(JSON.stringify({ envMapKeys: Object.keys(envMap), probes }, null, 2));
}

main().catch((error) => {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
