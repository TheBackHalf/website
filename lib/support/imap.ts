import net from "node:net";
import tls from "node:tls";
import { getSmtpConfig } from "@/lib/auth/email/smtp";
import { ingestInboundEmail } from "@/lib/support/inbound";
import { SUPPORT_MAILBOX } from "@/lib/support/catalog";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function isImapReady(): boolean {
  const smtp = getSmtpConfig();
  return Boolean(smtp.user && smtp.password);
}

function encodeLiteral(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

async function readUntil(
  socket: net.Socket,
  tag: string,
  timeoutMs = 20000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`IMAP timeout waiting for ${tag}`));
    }, timeoutMs);
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/);
      if (lines.some((line) => line.startsWith(`${tag} `) || line.startsWith("* BYE"))) {
        cleanup();
        resolve(buffer);
      }
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
    };
    socket.on("data", onData);
    socket.on("error", onError);
  });
}

function header(raw: string, name: string): string {
  const match = raw.match(new RegExp(`^${name}:\\s*(.+)$`, "im"));
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function parseFrom(value: string): { name: string; email: string } {
  const angle = value.match(/^(.*)<([^>]+)>$/);
  if (angle) {
    return {
      name: angle[1]!.replaceAll('"', "").trim(),
      email: angle[2]!.trim().toLowerCase(),
    };
  }
  return { name: "", email: value.trim().toLowerCase() };
}

export async function pollSupportMailbox(options?: {
  limit?: number;
  test?: boolean;
}): Promise<{ fetched: number; tickets: string[]; error?: string }> {
  if (!isImapReady()) {
    return { fetched: 0, tickets: [], error: "IMAP not configured (uses SMTP_USER / SMTP_PASSWORD)." };
  }
  const smtp = getSmtpConfig();
  const host = readEnv("SUPPORT_IMAP_HOST") ?? "imap.gmail.com";
  const port = Number(readEnv("SUPPORT_IMAP_PORT") ?? "993");
  const user = readEnv("SUPPORT_IMAP_USER") ?? smtp.user!;
  const password = smtp.password!;
  const limit = options?.limit ?? 20;
  const tickets: string[] = [];

  const socket = tls.connect({ host, port, servername: host });
  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("secureConnect", () => resolve());
      socket.once("error", reject);
    });
    await readUntil(socket, "*", 15000);
    socket.write(`A1 LOGIN ${encodeLiteral(user)} ${encodeLiteral(password)}\r\n`);
    const login = await readUntil(socket, "A1");
    if (!/A1 OK/i.test(login)) {
      return { fetched: 0, tickets: [], error: "IMAP login failed." };
    }
    socket.write(`A2 SELECT INBOX\r\n`);
    const selected = await readUntil(socket, "A2");
    if (!/A2 OK/i.test(selected)) {
      return { fetched: 0, tickets: [], error: "IMAP SELECT failed." };
    }
    socket.write(`A3 SEARCH UNSEEN\r\n`);
    const search = await readUntil(socket, "A3");
    const searchLine =
      search.split(/\r?\n/).find((line) => line.startsWith("* SEARCH")) ?? "";
    const uniq = searchLine
      .replace("* SEARCH", "")
      .trim()
      .split(/\s+/)
      .filter((id) => /^\d+$/.test(id))
      .slice(0, limit);
    for (const id of uniq) {
      socket.write(`A4 FETCH ${id} (BODY.PEEK[HEADER] BODY.PEEK[TEXT])\r\n`);
      const fetched = await readUntil(socket, "A4");
      const headerBlock = fetched.match(/BODY\[HEADER\][\s\S]*?\{(\d+)\}\r?\n([\s\S]*)/)?.[2] ?? fetched;
      const textBlock = fetched.match(/BODY\[TEXT\][\s\S]*?\{(\d+)\}\r?\n([\s\S]*)/)?.[2] ?? "";
      const from = parseFrom(header(headerBlock, "From"));
      const subject = header(headerBlock, "Subject") || "(no subject)";
      const messageId = header(headerBlock, "Message-ID") || `imap-${id}@local`;
      const to = header(headerBlock, "To") || SUPPORT_MAILBOX;
      const result = await ingestInboundEmail({
        messageId,
        fromName: from.name,
        fromEmail: from.email,
        to,
        subject,
        text: textBlock.replace(/\)\s*$/, "").trim() || subject,
        inReplyTo: header(headerBlock, "In-Reply-To"),
        references: header(headerBlock, "References"),
        test: options?.test,
      });
      if (result.kind === "ticket") {
        tickets.push(result.ticket.id);
      }
    }
    socket.write(`A5 LOGOUT\r\n`);
    await readUntil(socket, "A5").catch(() => undefined);
    return { fetched: uniq.length, tickets };
  } catch (error) {
    return {
      fetched: 0,
      tickets,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    socket.end();
  }
}
