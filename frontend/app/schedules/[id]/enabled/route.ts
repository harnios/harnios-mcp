import { NextRequest, NextResponse } from "next/server";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { updateFile } from "@/lib/storage/files";
import { getSchedule, pathForSlug, serializeScheduleFile } from "@/lib/scheduler/parseSchedule";

/** Toggles a Scheduled Task's enabled/disabled state — governs automatic execution only (spec 032, US2, FR-003, FR-015). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    return NextResponse.json({ error: "invalid_request", error_description: "No active owner session" }, { status: 401 });
  }

  const { id } = await params;
  const schedule = await getSchedule(id);
  if (!schedule) {
    return NextResponse.json({ error: "not_found", error_description: `No scheduled task "${id}"` }, { status: 404 });
  }

  const form = await request.formData();
  const enabled = form.get("to")?.toString() === "enabled";

  const content = serializeScheduleFile({
    name: schedule.name,
    cron: schedule.cron,
    enabled,
    model: schedule.model,
    timezone: schedule.timezone ?? "",
    body: schedule.body,
  });
  await updateFile(pathForSlug(id), Buffer.from(content, "utf-8"), "text/markdown");

  return NextResponse.redirect(
    new URL(`/schedules?changed=${encodeURIComponent(schedule.name)}&to=${enabled ? "enabled" : "disabled"}`, request.url),
    { status: 303 },
  );
}
