import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { authorizeShare } from "@/lib/sharing/authorize";
import { contentKind, filenameForPath, safeShareContentType } from "@/lib/sharing/contentPolicy";
import { shareCookieName } from "@/lib/sharing/credentials";
import { publicShareError, securityHeaders } from "@/lib/sharing/http";
import { recordTemporaryShareAccess } from "@/lib/sharing/store";
import { readFile } from "@/lib/storage/files";
import { StorageError } from "@/lib/storage/errors";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rawToken = decodeURIComponent(token);
  const cookieValue = (await cookies()).get(shareCookieName())?.value;
  const authorization = await authorizeShare(rawToken, { cookieValue });
  if (!authorization.ok) return publicShareError(authorization.reason, authorization.reason === "password_required" ? 401 : 404);

  try {
    const file = await readFile(authorization.share.filePath);
    const kind = contentKind(authorization.share.filePath, file.contentType);
    if (kind === "unsupported") return publicShareError("unavailable", 415);
    await recordTemporaryShareAccess(authorization.share.id);
    return new NextResponse(new Uint8Array(file.content), {
      status: 200,
      headers: {
        ...securityHeaders(),
        "Content-Type": safeShareContentType(kind, file.contentType),
        "Content-Disposition": `inline; filename="${filenameForPath(authorization.share.filePath)}"`,
      },
    });
  } catch (err) {
    const code = err instanceof StorageError && err.code === "not_found" ? "unavailable" : "invalid";
    return publicShareError(code, code === "unavailable" ? 404 : 502);
  }
}
