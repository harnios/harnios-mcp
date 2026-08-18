import { NextRequest, NextResponse } from "next/server";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { getOrRefreshCatalog } from "@/lib/external-mcp/catalog";
import { getExternalServerConnection } from "@/lib/external-mcp/store";

/** Owner-initiated manual "refresh now", bypassing the catalog TTL (spec 031, US2, FR-014). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "No active owner session" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const connection = await getExternalServerConnection(id);
  if (!connection) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Unknown connection" },
      { status: 404 },
    );
  }

  await getOrRefreshCatalog(connection, { force: true });

  return NextResponse.redirect(new URL("/tools/connections", request.url), { status: 303 });
}
