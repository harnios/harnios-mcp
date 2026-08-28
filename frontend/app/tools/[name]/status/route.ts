import { NextRequest, NextResponse } from "next/server";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { TOOL_CATALOG } from "@/lib/mcp-tools/catalog";
import { setToolDisabled } from "@/lib/mcp-tools/store";
import { getCachedCatalog, listExternalServerConnections } from "@/lib/external-mcp/store";
import { requestOrigin } from "@/lib/http";

/** True if `name` is a tool from any connected external server's cached catalog (spec 031, FR-008). */
async function isKnownExternalTool(name: string): Promise<boolean> {
  const connections = await listExternalServerConnections();
  const catalogs = await Promise.all(connections.map((connection) => getCachedCatalog(connection.id)));
  return catalogs.some((catalog) => catalog?.tools.some((tool) => tool.name === name) ?? false);
}

/** Owner-initiated tool status change, applied after confirmation (spec 025 FR-001, FR-006, FR-009, FR-010; extended by spec 031 FR-008 to externally-sourced tools). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "No active owner session" },
      { status: 401 },
    );
  }

  const { name } = await params;
  const form = await request.formData();
  const to = form.get("to");

  const knownTool = TOOL_CATALOG.some((tool) => tool.name === name) || (await isKnownExternalTool(name));
  if (!knownTool || (to !== "active" && to !== "disabled")) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Unknown tool or invalid status" },
      { status: 400 },
    );
  }

  await setToolDisabled(name, to === "disabled");

  return NextResponse.redirect(
    new URL(`/tools?changed=${encodeURIComponent(name)}&to=${encodeURIComponent(to)}`, requestOrigin(request)),
    { status: 303 },
  );
}
