import { NextRequest, NextResponse } from "next/server";
import { requestOrigin } from "@/lib/http";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { deleteFile } from "@/lib/storage/files";
import { getSchedule, pathForSlug } from "@/lib/scheduler/parseSchedule";
import { deleteRecord } from "@/lib/scheduler/store";

/**
 * Permanently removes a Scheduled Task's definition file (soft-deleted to
 * Trash, per the existing file-storage convention, spec 011) and its
 * Last-Run Bookkeeping record. Its past Task Execution Records are
 * deliberately kept — they're denormalized with taskName precisely so
 * history still reads correctly after the task is gone (data-model.md).
 */
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

  await deleteFile(pathForSlug(id));
  await deleteRecord(`last-run/${id}`);

  return NextResponse.redirect(
    new URL(`/schedules?changed=${encodeURIComponent(schedule.name)}&to=removed`, requestOrigin(request)),
    { status: 303 },
  );
}
