import { NextRequest, NextResponse } from "next/server";
import { requestOrigin } from "@/lib/http";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { updateFile } from "@/lib/storage/files";
import { getSchedule, pathForSlug, serializeScheduleFile } from "@/lib/scheduler/parseSchedule";
import { validateTaskInput } from "@/lib/scheduler/validateTask";

// A separate "save" path segment, not the bare `/schedules/[id]`, because
// that path already has a page.tsx (the detail/history view) — Next.js
// doesn't allow a route handler and a page to occupy the same path (same
// reasoning as spec 031's connection-management-routes.md `create`
// segment).

/** Saves edits to an existing Scheduled Task — does not change its slug/id (spec 032, US2, FR-014, FR-014a). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    return NextResponse.json({ error: "invalid_request", error_description: "No active owner session" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getSchedule(id);
  if (!existing) {
    return NextResponse.json({ error: "not_found", error_description: `No scheduled task "${id}"` }, { status: 404 });
  }

  const form = await request.formData();
  const name = form.get("name")?.toString().trim() ?? "";
  const cron = form.get("cron")?.toString().trim() ?? "";
  const timezone = form.get("timezone")?.toString().trim() ?? "";
  const model = form.get("model")?.toString().trim() ?? "";
  const prompt = form.get("prompt")?.toString() ?? "";
  const enabled = form.get("enabled")?.toString() === "true";

  const error = validateTaskInput({ name, cron, model, timezone, prompt });
  if (error) {
    return NextResponse.redirect(new URL(`/schedules/${id}/edit?error=${encodeURIComponent(error)}`, requestOrigin(request)), {
      status: 303,
    });
  }

  const content = serializeScheduleFile({ name, cron, enabled, model, timezone, body: prompt });
  await updateFile(pathForSlug(id), Buffer.from(content, "utf-8"), "text/markdown");

  return NextResponse.redirect(new URL("/schedules", requestOrigin(request)), { status: 303 });
}
