import { NextRequest, NextResponse } from "next/server";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { getOrRefreshCatalog } from "@/lib/external-mcp/catalog";
import { getExternalServerConnection, updateExternalServerConnection } from "@/lib/external-mcp/store";

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Edits an existing External Server Connection; a blank token leaves the stored one unchanged (spec 031, US3, FR-015). */
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

  const form = await request.formData();
  const label = form.get("label")?.toString().trim() ?? "";
  const url = form.get("url")?.toString().trim() ?? "";
  const token = form.get("token")?.toString().trim() ?? "";

  if (!label || !url) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Label and URL are required" },
      { status: 400 },
    );
  }

  if (!isValidHttpUrl(url)) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "URL must be a valid http(s):// address" },
      { status: 400 },
    );
  }

  await updateExternalServerConnection(id, { label, url, token: token || undefined });

  const full = await getExternalServerConnection(id);
  if (full) {
    await getOrRefreshCatalog(full, { force: true }).catch(() => undefined);
  }

  return NextResponse.redirect(new URL("/tools/connections", request.url), { status: 303 });
}
