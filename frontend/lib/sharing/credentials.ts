import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getCurrentGeneration } from "@/lib/oauth/sessionSecret";

const COOKIE_NAME = "harnios_share_access";
const COOKIE_TTL_MS = 15 * 60 * 1000;

export function shareCookieName(): string {
  return COOKIE_NAME;
}

export function createShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function digestShareToken(token: string): string {
  return createHmac("sha256", "harnios-share-token-v1").update(token).digest("hex");
}

export function hashSharePassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifySharePassword(password: string, hash: string, salt: string): boolean {
  try {
    const actual = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function issueShareAccessCookie(shareId: string, tokenDigest: string, expiresAt: string): Promise<string> {
  const now = Date.now();
  const cookieExpiresAt = Math.min(new Date(expiresAt).getTime(), now + COOKIE_TTL_MS);
  const payload = Buffer.from(JSON.stringify({ shareId, tokenDigest, expiresAt: new Date(cookieExpiresAt).toISOString(), purpose: "share-access" })).toString("base64url");
  const { secret } = await getCurrentGeneration();
  return `${payload}.${sign(payload, secret)}`;
}

export async function verifyShareAccessCookie(value: string | undefined, shareId: string, tokenDigest: string): Promise<boolean> {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  const { secret } = await getCurrentGeneration();
  const expected = sign(payload, secret);
  const actual = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (actual.length !== expectedBuffer.length || !timingSafeEqual(actual, expectedBuffer)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as { shareId?: string; tokenDigest?: string; expiresAt?: string; purpose?: string };
    return parsed.purpose === "share-access" && parsed.shareId === shareId && parsed.tokenDigest === tokenDigest && new Date(parsed.expiresAt ?? 0).getTime() > Date.now();
  } catch {
    return false;
  }
}
