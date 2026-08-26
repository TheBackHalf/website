/** Normalize email for duplicate detection and storage. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
