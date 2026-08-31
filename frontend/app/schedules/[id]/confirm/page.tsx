import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { getSchedule } from "@/lib/scheduler/parseSchedule";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";
import { Banner } from "@/app/_ui/Banner";
import { Button } from "@/app/_ui/Button";

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
      <Page size="sm">
        <PageHeader title={dict.confirmTitle} />
        <Banner tone="danger">
          <p>{dict.changeFailed(!schedule ? `unknown task "${id}"` : `invalid action "${to}"`)}</p>
        </Banner>
        <p>
          <a href="/schedules">{dict.title}</a>
        </p>
      </Page>
    );
  }

  return (
    <Page size="sm">
      <PageHeader title={dict.confirmTitle} />
      <p>{dict.confirmRemove(schedule.name)}</p>
      <Banner tone="warning">
        <p>{dict.removeWarning}</p>
      </Banner>
      <form method="POST" action={`/schedules/${schedule.id}/remove`} className="cluster">
        <Button type="submit" variant="danger">
          {dict.confirmButton}
        </Button>
        <Button as="a" href="/schedules" variant="ghost">
          {dict.cancelButton}
        </Button>
      </form>
    </Page>
  );
}
