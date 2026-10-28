import { compare, hash } from "bcryptjs";

/** bcrypt cost factor. 12 is a good balance of security and latency. */
const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < 10) {
    throw new Error("Password must be at least 10 characters long");
  }
  return hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  passwordHash: string,
): Promise<boolean> {
  if (!plain || !passwordHash) return false;
  try {
    return await compare(plain, passwordHash);
  } catch {
    return false;
  }
}

/** Minimum policy enforced on password changes (server side). */
export function describePasswordPolicy(): string {
  return "At least 10 characters, including a letter and a number.";
}

export function isValidPasswordPolicy(plain: string): boolean {
  return plain.length >= 10 && /[A-Za-z]/.test(plain) && /\d/.test(plain);
}
