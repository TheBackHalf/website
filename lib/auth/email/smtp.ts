import nodemailer from "nodemailer";

export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
  fromName?: string;
  fromAddress?: string;
  replyTo?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getSmtpConfig() {
  const host = readEnv("SMTP_HOST");
  const portRaw = readEnv("SMTP_PORT") ?? "587";
  const user = readEnv("SMTP_USER");
  const password = readEnv("SMTP_PASSWORD")?.replace(/\s+/g, "");
  const from = readEnv("SMTP_FROM");
  const port = Number(portRaw);

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    user,
    password,
    from,
  };
}

export function getSmtpEnvPresence(): Record<
  "SMTP_HOST" | "SMTP_PORT" | "SMTP_USER" | "SMTP_PASSWORD" | "SMTP_FROM",
  boolean
> {
  return {
    SMTP_HOST: Boolean(readEnv("SMTP_HOST")),
    SMTP_PORT: Boolean(readEnv("SMTP_PORT")),
    SMTP_USER: Boolean(readEnv("SMTP_USER")),
    SMTP_PASSWORD: Boolean(readEnv("SMTP_PASSWORD")?.replace(/\s+/g, "")),
    SMTP_FROM: Boolean(readEnv("SMTP_FROM")),
  };
}

export function isSmtpReady(): boolean {
  const config = getSmtpConfig();
  return Boolean(
    config.host &&
      config.port &&
      config.user &&
      config.password &&
      config.from,
  );
}

export async function sendSmtpEmail(
  message: OutboundEmail,
): Promise<
  | { status: "sent"; response: string }
  | { status: "not_configured"; error: string }
  | { status: "failed"; error: string }
> {
  const config = getSmtpConfig();

  if (!isSmtpReady()) {
    return {
      status: "not_configured",
      error:
        "SMTP is incomplete. Require SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM.",
    };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port === 587,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: {
      user: config.user!,
      pass: config.password!,
    },
  });

  try {
    await transporter.verify();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { status: "failed", error: `SMTP authentication failed: ${detail}` };
  }

  try {
    const fromAddress = message.fromAddress ?? config.from!;
    const from = message.fromName
      ? `"${message.fromName.replaceAll('"', "")}" <${fromAddress}>`
      : fromAddress;

    const info = await transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      replyTo: message.replyTo,
      messageId: message.messageId,
      inReplyTo: message.inReplyTo,
      references: message.references,
    });

    return {
      status: "sent",
      response: String(info.response ?? info.messageId ?? "accepted"),
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { status: "failed", error: `SMTP send failed: ${detail}` };
  }
}
