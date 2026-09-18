import { digestShareToken, verifyShareAccessCookie, verifySharePassword } from "./credentials";
import { getTemporaryShareByTokenDigest } from "./store";
import type { ShareAuthorizationResult, TemporaryShare } from "./types";

export async function authorizeShare(
  token: string,
  options: { cookieValue?: string; password?: string } = {},
): Promise<ShareAuthorizationResult> {
  if (!token || token.length < 20) return { ok: false, reason: "invalid" };
  const tokenDigest = digestShareToken(token);
  const share = await getTemporaryShareByTokenDigest(tokenDigest);
  if (!share) return { ok: false, reason: "invalid" };
  if (share.status === "revoked") return { ok: false, reason: "revoked" };
  if (new Date(share.expiresAt).getTime() <= Date.now()) return { ok: false, reason: "expired" };

  if (share.passwordHash && share.passwordSalt) {
    const cookieValid = await verifyShareAccessCookie(options.cookieValue, share.id, tokenDigest);
    const passwordValid = options.password !== undefined && verifySharePassword(options.password, share.passwordHash, share.passwordSalt);
    if (!cookieValid && !passwordValid) {
      return { ok: false, reason: options.password === undefined ? "password_required" : "password_invalid" };
    }
  }

  return { ok: true, share, passwordRequired: false };
}

export function isShareUnavailableError(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "not_found");
}

export function shareFilePath(share: TemporaryShare): string {
  return share.filePath;
}
