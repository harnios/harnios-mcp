import { NextRequest, NextResponse } from "next/server";
import { requestOrigin } from "@/lib/http";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { createFile } from "@/lib/storage/files";
import { listSchedules, pathForSlug, serializeScheduleFile } from "@/lib/scheduler/parseSchedule";
import { slugify, validateTaskInput } from "@/lib/scheduler/validateTask";

/** Creates a new Scheduled Task file, rejecting invalid input before anything is written (spec 032, US2, FR-014, FR-014a). */
export async function POST(request: NextRequest) {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    return NextResponse.json({ error: "invalid_request", error_description: "No active owner session" }, { status: 401 });
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
    return NextResponse.redirect(new URL(`/schedules/new?error=${encodeURIComponent(error)}`, requestOrigin(request)), {
      status: 303,
    });
  }

  const existingIds = new Set((await listSchedules()).map((schedule) => schedule.id));
  let slug = slugify(name);
  let suffix = 2;
  while (existingIds.has(slug)) {
    slug = `${slugify(name)}-${suffix}`;
    suffix += 1;
  }

  const content = serializeScheduleFile({ name, cron, enabled, model, timezone, body: prompt });
  await createFile(pathForSlug(slug), Buffer.from(content, "utf-8"), "text/markdown");

  return NextResponse.redirect(new URL("/schedules", requestOrigin(request)), { status: 303 });
}
