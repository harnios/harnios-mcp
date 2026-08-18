import { NextRequest, NextResponse } from "next/server";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { getOrRefreshCatalog } from "@/lib/external-mcp/catalog";
import { createExternalServerConnection, getExternalServerConnection } from "@/lib/external-mcp/store";

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Creates a new External Server Connection and immediately attempts a catalog refresh (spec 031, US3, FR-001, FR-014). */
export async function POST(request: NextRequest) {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "No active owner session" },
      { status: 401 },
    );
  }

  const form = await request.formData();
  const label = form.get("label")?.toString().trim() ?? "";
  const url = form.get("url")?.toString().trim() ?? "";
  const token = form.get("token")?.toString().trim() ?? "";

  if (!label || !url || !token) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Label, URL, and token are all required" },
      { status: 400 },
    );
  }

  if (!isValidHttpUrl(url)) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "URL must be a valid http(s):// address" },
      { status: 400 },
    );
  }

  const connection = await createExternalServerConnection({ label, url, token });

  // Not blocked by this failing (FR-014) — the connection is saved either
  // way; the catalog's lastError, if any, is surfaced on the list page.
  const full = await getExternalServerConnection(connection.id);
  if (full) {
    await getOrRefreshCatalog(full, { force: true }).catch(() => undefined);
  }

  return NextResponse.redirect(new URL("/tools/connections", request.url), { status: 303 });
}
