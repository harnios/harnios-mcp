import { NextResponse } from "next/server";
import type { ShareAuthorizationResult } from "./types";

export function publicShareError(reason: Exclude<ShareAuthorizationResult, { ok: true }>["reason"], status = 404): NextResponse {
  return NextResponse.json({ code: reason, message: reason === "password_required" ? "Password required" : "This shared file is not available" }, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export function securityHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; media-src 'self'; frame-src 'self'; script-src 'none'; object-src 'none'",
    "Referrer-Policy": "no-referrer",
  };
}
