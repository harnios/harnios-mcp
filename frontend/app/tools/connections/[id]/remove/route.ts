import { NextRequest, NextResponse } from "next/server";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { deleteExternalServerConnection, getExternalServerConnection } from "@/lib/external-mcp/store";

/** Permanently removes an External Server Connection and its cached catalog/rate-limit records (spec 031, US2, FR-009). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "No active owner session" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const existing = await getExternalServerConnection(id);
  if (!existing) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Unknown connection" },
      { status: 404 },
    );
  }

  await deleteExternalServerConnection(id);

  return NextResponse.redirect(
    new URL(`/tools/connections?changed=${encodeURIComponent(id)}&to=removed`, request.url),
    { status: 303 },
  );
}
