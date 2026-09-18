export type TemporaryShareStatus = "active" | "revoked";

export interface TemporaryShare {
  id: string;
  tokenDigest: string;
  filePath: string;
  createdAt: string;
  expiresAt: string;
  status: TemporaryShareStatus;
  revokedAt: string | null;
  passwordHash: string | null;
  passwordSalt: string | null;
  updatedAt: string;
  lastAccessedAt: string | null;
  accessCount: number;
}

export interface TemporaryShareSummary {
  id: string;
  path: string;
  expiresAt: string;
  status: TemporaryShareStatus | "expired";
  passwordProtected: boolean;
  accessCount: number;
  lastAccessedAt: string | null;
}

export interface CreateTemporaryShareInput {
  path: string;
  expiresAt: string;
  password?: string;
}

export type ShareAuthorizationResult =
  | { ok: true; share: TemporaryShare; passwordRequired: false }
  | { ok: true; share: TemporaryShare; passwordRequired: true }
  | { ok: false; reason: "invalid" | "expired" | "revoked" | "password_required" | "password_invalid" | "unavailable" };
