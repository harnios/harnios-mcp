import type { CSSProperties } from "react";
import { notFound, redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { getSchedule } from "@/lib/scheduler/parseSchedule";
import { listRecords } from "@/lib/scheduler/store";
import type { ScheduleRunRecord } from "@/lib/scheduler/types";
import { SUPPORTED_MODELS } from "@/lib/scheduler/models";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { HomeLink } from "@/app/HomeLink";

const cellStyle: CSSProperties = { textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #ddd" };

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
  const fullDict = getDictionary(await resolveLanguage());
  const dict = fullDict.schedules;
  const modelLabel = SUPPORTED_MODELS.find((model) => model.id === schedule.model)?.label ?? schedule.model;

  const allRuns = await listRecords<ScheduleRunRecord>("runs/");
  const runs = allRuns
    .filter((run) => run.taskId === id)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  return (
    <main style={{ maxWidth: 900, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <HomeLink label={fullDict.common.homeLink} />
      <h1>{schedule.name}</h1>
      {alreadyRunning === "true" && (
        <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: "0.75rem 1rem", marginBottom: "1rem" }}>
          <p style={{ margin: 0 }}>{dict.runNowAlreadyRunning}</p>
        </div>
      )}
      <p>
        <code>
          {schedule.cron}
          {schedule.timezone ? ` (${schedule.timezone})` : ""}
        </code>{" "}
        · {modelLabel} · {schedule.enabled ? dict.enabledLabel : dict.disabledLabel}
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
        <a href={`/schedules/${schedule.id}/edit`}>{dict.editAction}</a>
        <form method="POST" action={`/schedules/${schedule.id}/run`}>
          <button type="submit">{dict.runNowAction}</button>
        </form>
        <a href={`/schedules/${schedule.id}/confirm?to=removed`}>{dict.removeAction}</a>
        <a href="/schedules">{dict.backLink}</a>
      </div>

      <h2>{dict.historyTitle}</h2>
      {runs.length === 0 ? (
        <p>{dict.historyEmpty}</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={cellStyle}>{dict.startedAtHeader}</th>
              <th style={cellStyle}>{dict.statusHeader}</th>
              <th style={cellStyle}>{dict.summaryHeader}</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.runId}>
                <td style={cellStyle}>
                  {new Date(run.startedAt).toLocaleString()}
                  {" — "}
                  {run.trigger === "manual" ? dict.triggerManual : dict.triggerScheduled}
                </td>
                <td style={cellStyle}>{run.status === "success" ? dict.statusSuccess : dict.statusFailure}</td>
                <td style={cellStyle}>{run.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
