import bcrypt from "bcryptjs";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/config";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function validatePasswordStrength(password: string): string | undefined {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number.";
  }

  return undefined;
}
