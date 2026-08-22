import { NextRequest, NextResponse } from "next/server";
import { requestOrigin } from "@/lib/http";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { getSchedule } from "@/lib/scheduler/parseSchedule";
import { beginRun, endRun, isRunning } from "@/lib/scheduler/runGuard";
import { runSchedule } from "@/lib/scheduler/runSchedule";

// A manual run can take up to the 5-minute run timeout (runSchedule.ts) —
// this route awaits it synchronously so the redirect lands on a settled
// outcome (contracts/scheduled-tasks-routes.md).
export const maxDuration = 300;

/** Manually triggers an immediate execution of a Scheduled Task, bypassing its schedule and enabled/disabled state entirely (spec 032, US3, FR-015). */
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

  if (isRunning(id) || !beginRun(id)) {
    return NextResponse.redirect(new URL(`/schedules/${id}?alreadyRunning=true`, requestOrigin(request)), { status: 303 });
  }

  try {
    await runSchedule(schedule, "manual");
  } finally {
    endRun(id);
  }

  return NextResponse.redirect(new URL(`/schedules/${id}`, requestOrigin(request)), { status: 303 });
}
