import { NextRequest, NextResponse } from "next/server";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { setConnectionEnabled } from "@/lib/external-mcp/store";

/** Pauses/resumes a whole External Server Connection without touching its saved config (spec 031, US2, FR-017). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "No active owner session" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const form = await request.formData();
  const to = form.get("to");

  if (to !== "enabled" && to !== "disabled") {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Invalid status" },
      { status: 400 },
    );
  }

  const updated = await setConnectionEnabled(id, to === "enabled");
  if (!updated) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Unknown connection" },
      { status: 404 },
    );
  }

  return NextResponse.redirect(
    new URL(`/tools/connections?changed=${encodeURIComponent(id)}&to=${encodeURIComponent(to)}`, request.url),
    { status: 303 },
  );
}
