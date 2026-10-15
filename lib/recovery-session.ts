import { createHmac, timingSafeEqual } from "node:crypto";

export const RECOVERY_COOKIE_NAME = "spendwise-recovery";
export const RECOVERY_SESSION_TTL_SECONDS = 60 * 60;

function recoverySecret() {
  const secret = process.env.AUTH_RECOVERY_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("AUTH_RECOVERY_SECRET must contain at least 32 bytes.");
  }
  return secret;
}

function signRecoverySession(userId: string, expiresAt: number) {
  return createHmac("sha256", recoverySecret())
    .update(`${userId}:${expiresAt}`)
    .digest("hex");
}

export function createRecoverySessionValue(userId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + RECOVERY_SESSION_TTL_SECONDS;
  return `${expiresAt}.${signRecoverySession(userId, expiresAt)}`;
}

export function isValidRecoverySession(userId: string, value?: string) {
  if (!value) return false;

  try {
    const [expiry, signature, ...extra] = value.split(".");
    const expiresAt = Number(expiry);
    const now = Math.floor(Date.now() / 1000);
    if (
      extra.length > 0 ||
      !Number.isSafeInteger(expiresAt) ||
      expiresAt <= now ||
      expiresAt > now + RECOVERY_SESSION_TTL_SECONDS
    ) {
      return false;
    }
    const expected = Buffer.from(signRecoverySession(userId, expiresAt), "hex");
    const actual = Buffer.from(signature ?? "", "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function refreshRecoverySessionValue(userId: string, value?: string) {
  return isValidRecoverySession(userId, value) ? createRecoverySessionValue(userId) : undefined;
}
