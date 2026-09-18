import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { authorizeShare } from "@/lib/sharing/authorize";
import { issueShareAccessCookie, shareCookieName } from "@/lib/sharing/credentials";
import { securityHeaders } from "@/lib/sharing/http";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rawToken = decodeURIComponent(token);
  let password = "";
  try {
    password = String(((await request.formData()).get("password") ?? ""));
  } catch {
    return NextResponse.json({ code: "password_invalid", message: "Invalid password" }, { status: 400, headers: securityHeaders() });
  }
  const result = await authorizeShare(rawToken, { password });
  if (!result.ok) {
    return NextResponse.redirect(new URL(`/share/${encodeURIComponent(rawToken)}?error=password`, request.url), { status: 303 });
  }
  const cookie = await issueShareAccessCookie(result.share.id, result.share.tokenDigest, result.share.expiresAt);
  const response = NextResponse.redirect(new URL(`/share/${encodeURIComponent(rawToken)}`, request.url), { status: 303 });
  response.cookies.set(cookieName(), cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/share/${encodeURIComponent(rawToken)}`,
    expires: new Date(Math.min(Date.now() + 15 * 60 * 1000, new Date(result.share.expiresAt).getTime())),
  });
  return response;
}

function cookieName(): string {
  return shareCookieName();
}
