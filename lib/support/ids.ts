import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createSupportTicketId(at = new Date()): string {
  const stamp = at.toISOString().slice(0, 10).replaceAll("-", "");
  const bytes = randomBytes(5);
  let suffix = "";
  for (const byte of bytes) {
    suffix += ALPHABET[byte % ALPHABET.length];
  }
  return `BH-S-${stamp}-${suffix}`;
}

export function ticketIdFromText(value: string): string | undefined {
  const match = value.match(/BH-S-\d{8}-[A-Z0-9]{5,}/i);
  return match ? match[0].toUpperCase() : undefined;
}
