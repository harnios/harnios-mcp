import { notFound, redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { getSchedule } from "@/lib/scheduler/parseSchedule";
import { listRecords } from "@/lib/scheduler/store";
import type { ScheduleRunRecord } from "@/lib/scheduler/types";
import { SUPPORTED_MODELS } from "@/lib/scheduler/models";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";
import { Banner } from "@/app/_ui/Banner";

/** Shows a Scheduled Task's current definition and full execution history, newest first (spec 032, US3, FR-016). */
export default async function ScheduleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ alreadyRunning?: string }>;
}) {
  const signedIn = await hasActiveOwnerSession();
  const { id } = await params;
  if (!signedIn) {
    redirect(`/oauth/login?continue=${encodeURIComponent(`/schedules/${id}`)}`);
  }

  const schedule = await getSchedule(id);
  if (!schedule) notFound();

  const { alreadyRunning } = await searchParams;
  const dict = getDictionary(await resolveLanguage()).schedules;
  const modelLabel = SUPPORTED_MODELS.find((model) => model.id === schedule.model)?.label ?? schedule.model;

  const allRuns = await listRecords<ScheduleRunRecord>("runs/");
  const runs = allRuns
    .filter((run) => run.taskId === id)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  return (
    <Page size="lg">
      <PageHeader title={schedule.name} />
      {alreadyRunning === "true" && (
        <Banner tone="info">
          <p>{dict.runNowAlreadyRunning}</p>
        </Banner>
      )}
      <p>
        <code>
          {schedule.cron}
          {schedule.timezone ? ` (${schedule.timezone})` : ""}
        </code>{" "}
        · {modelLabel} · {schedule.enabled ? dict.enabledLabel : dict.disabledLabel}
      </p>
      <div className="cluster" style={{ marginBottom: "var(--space-5)" }}>
        <a href={`/schedules/${schedule.id}/edit`}>{dict.editAction}</a>
        <form method="POST" action={`/schedules/${schedule.id}/run`}>
          <button type="submit" className="btn btn--secondary">
            {dict.runNowAction}
          </button>
        </form>
        <a href={`/schedules/${schedule.id}/confirm?to=removed`}>{dict.removeAction}</a>
        <a href="/schedules">{dict.backLink}</a>
      </div>

      <h2>{dict.historyTitle}</h2>
      {runs.length === 0 ? (
        <p>{dict.historyEmpty}</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>{dict.startedAtHeader}</th>
              <th>{dict.statusHeader}</th>
              <th>{dict.summaryHeader}</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.runId}>
                <td>
                  {new Date(run.startedAt).toLocaleString()}
                  {" — "}
                  {run.trigger === "manual" ? dict.triggerManual : dict.triggerScheduled}
                </td>
                <td>{run.status === "success" ? dict.statusSuccess : dict.statusFailure}</td>
                <td>{run.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Page>
  );
}
