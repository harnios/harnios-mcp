import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { getSchedule } from "@/lib/scheduler/parseSchedule";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";

/** Owner-gated confirmation screen before permanently deleting a Scheduled Task (spec 032, destructive-action confirm-then-apply, mirrors spec 031's connection removal). */
export default async function ConfirmScheduleRemovePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ to?: string }>;
}) {
  const { id } = await params;
  const { to } = await searchParams;
  const currentUrl = `/schedules/${encodeURIComponent(id)}/confirm?to=${encodeURIComponent(to ?? "")}`;

  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    redirect(`/oauth/login?continue=${encodeURIComponent(currentUrl)}`);
  }

  const dict = getDictionary(await resolveLanguage()).schedules;
  const schedule = await getSchedule(id);
  const validTo = to === "removed";

  if (!schedule || !validTo) {
    return (
      <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
        <h1>{dict.confirmTitle}</h1>
        <p>{dict.changeFailed(!schedule ? `unknown task "${id}"` : `invalid action "${to}"`)}</p>
        <p>
          <a href="/schedules">{dict.title}</a>
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>{dict.confirmTitle}</h1>
      <p>{dict.confirmRemove(schedule.name)}</p>
      <p>{dict.removeWarning}</p>
      <form method="POST" action={`/schedules/${schedule.id}/remove`} style={{ display: "flex", gap: 8 }}>
        <button type="submit">{dict.confirmButton}</button>
        <a href="/schedules">{dict.cancelButton}</a>
      </form>
    </main>
  );
}
