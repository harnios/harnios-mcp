import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { listSchedules } from "@/lib/scheduler/parseSchedule";
import { getRecord } from "@/lib/scheduler/store";
import type { LastRunRecord } from "@/lib/scheduler/types";
import { SUPPORTED_MODELS } from "@/lib/scheduler/models";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";

const cellStyle: CSSProperties = { textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #ddd" };

function modelLabel(id: string): string {
  return SUPPORTED_MODELS.find((model) => model.id === id)?.label ?? id;
}

/** Lists every Scheduled Task, its status, and links to manage it (spec 032, US2). */
export default async function SchedulesPage({
  searchParams,
}: {
  searchParams: Promise<{ changed?: string; to?: string }>;
}) {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    redirect(`/oauth/login?continue=${encodeURIComponent("/schedules")}`);
  }

  const { changed, to } = await searchParams;
  const dict = getDictionary(await resolveLanguage()).schedules;
  const changedStatusLabel = to === "enabled" ? dict.enabledLabel : to === "disabled" ? dict.disabledLabel : undefined;

  const schedules = await listSchedules();
  const lastRuns = new Map<string, LastRunRecord>();
  await Promise.all(
    schedules.map(async (schedule) => {
      const lastRun = await getRecord<LastRunRecord>(`last-run/${schedule.id}`);
      if (lastRun) lastRuns.set(schedule.id, lastRun);
    }),
  );

  return (
    <main style={{ maxWidth: 900, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>{dict.title}</h1>
      <p>{dict.description}</p>

      {changed && changedStatusLabel && (
        <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: "0.75rem 1rem", marginBottom: "1rem" }}>
          <p style={{ margin: 0 }}>{dict.changedBanner(changed, changedStatusLabel)}</p>
        </div>
      )}

      {schedules.length === 0 ? (
        <p>{dict.empty}</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={cellStyle}>{dict.nameHeader}</th>
              <th style={cellStyle}>{dict.cronHeader}</th>
              <th style={cellStyle}>{dict.modelHeader}</th>
              <th style={cellStyle}>{dict.statusHeader}</th>
              <th style={cellStyle}>{dict.lastRunHeader}</th>
              <th style={cellStyle} />
            </tr>
          </thead>
          <tbody>
            {schedules
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((schedule) => {
                const lastRun = lastRuns.get(schedule.id);
                return (
                  <tr key={schedule.id}>
                    <td style={cellStyle}>
                      <a href={`/schedules/${schedule.id}`}>{schedule.name}</a>
                    </td>
                    <td style={cellStyle}>
                      <code>
                        {schedule.cron}
                        {schedule.timezone ? ` (${schedule.timezone})` : ""}
                      </code>
                    </td>
                    <td style={cellStyle}>{modelLabel(schedule.model)}</td>
                    <td style={cellStyle}>{schedule.enabled ? dict.enabledLabel : dict.disabledLabel}</td>
                    <td style={cellStyle}>
                      {lastRun
                        ? `${lastRun.lastStatus} — ${new Date(lastRun.lastRunAt).toLocaleString()}`
                        : dict.neverRun}
                    </td>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <a href={`/schedules/${schedule.id}/edit`}>{dict.editAction}</a>
                        <form method="POST" action={`/schedules/${schedule.id}/enabled`}>
                          <input type="hidden" name="to" value={schedule.enabled ? "disabled" : "enabled"} />
                          <button type="submit">{schedule.enabled ? dict.disableAction : dict.enableAction}</button>
                        </form>
                        <form method="POST" action={`/schedules/${schedule.id}/run`}>
                          <button type="submit">{dict.runNowAction}</button>
                        </form>
                        <a href={`/schedules/${schedule.id}`}>{dict.historyLink}</a>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      )}

      <p>
        <a href="/schedules/new">{dict.newLink}</a>
      </p>
    </main>
  );
}
