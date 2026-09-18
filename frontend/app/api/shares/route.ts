import { NextRequest, NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/oauth/session";
import { getFileMetadata } from "@/lib/storage/files";
import { normalizeFilePath } from "@/lib/storage/paths";
import { createShareToken, digestShareToken, hashSharePassword } from "@/lib/sharing/credentials";
import { createTemporaryShare, listTemporaryShares, revokeTemporaryShare } from "@/lib/sharing/store";
import { SHARES_PREFIX } from "@/lib/sharing/store";
import type { CreateTemporaryShareInput } from "@/lib/sharing/types";
import { getPublicAppUrl, PublicUrlConfigError } from "@/lib/config/publicUrl";

const MAX_SHARE_MS = 30 * 24 * 60 * 60 * 1000;

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ code: "invalid_share", message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const authError = await requireOwnerSession();
  if (authError) return authError;
  return NextResponse.json(await listTemporaryShares(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const authError = await requireOwnerSession();
  if (authError) return authError;

  let body: CreateTemporaryShareInput;
  try {
    body = (await request.json()) as CreateTemporaryShareInput;
  } catch {
    return jsonError("A JSON request body is required", 400);
  }

  const filePath = normalizeFilePath(body.path ?? "");
  if (!filePath || filePath.startsWith(SHARES_PREFIX) || filePath.includes("..")) {
    return jsonError("A valid file path is required", 400);
  }
  const expiresAtMs = new Date(body.expiresAt ?? "").getTime();
  const now = Date.now();
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now || expiresAtMs > now + MAX_SHARE_MS) {
    return jsonError("The expiration must be in the future and no more than 30 days away", 400);
  }
  if (body.password !== undefined && body.password.length === 0) {
    return jsonError("The password cannot be empty", 400);
  }

  let publicAppUrl: string;
  try {
    publicAppUrl = getPublicAppUrl();
  } catch (err) {
    if (err instanceof PublicUrlConfigError) return jsonError("The public application URL is not configured", 503);
    return jsonError("The public application URL is unavailable", 503);
  }

  try {
    await getFileMetadata(filePath);
    const token = createShareToken();
    const password = body.password ? hashSharePassword(body.password) : null;
    const created = await createTemporaryShare({
      tokenDigest: digestShareToken(token),
      filePath,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
      status: "active",
      revokedAt: null,
      passwordHash: password?.hash ?? null,
      passwordSalt: password?.salt ?? null,
      updatedAt: new Date(now).toISOString(),
      lastAccessedAt: null,
      accessCount: 0,
    });
    return NextResponse.json(
      {
        id: created.id,
        path: created.filePath,
        url: `${publicAppUrl}/share/${encodeURIComponent(token)}`,
        expiresAt: created.expiresAt,
        passwordProtected: Boolean(created.passwordHash),
        status: "active",
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const code = (err as { code?: string })?.code;
    return jsonError(code === "not_found" ? "The file does not exist" : "Unable to create the share", code === "not_found" ? 404 : 502);
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireOwnerSession();
  if (authError) return authError;
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) return jsonError("Share id is required", 400);
  const revoked = await revokeTemporaryShare(id);
  if (!revoked) return jsonError("Share not found", 404);
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
