import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";
import { ShareManager } from "./ShareManager";

export default async function SharesPage() {
  if (!(await hasActiveOwnerSession())) redirect(`/oauth/login?continue=${encodeURIComponent("/shares")}`);
  const dict = getDictionary(await resolveLanguage()).editor.file;
  return (
    <Page size="lg">
      <PageHeader title={dict.shareManager} description={dict.shareManagerDescription} />
      <ShareManager dict={dict} />
    </Page>
  );
}
