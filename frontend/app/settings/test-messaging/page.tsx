import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";
import { MessagingTestForm } from "./MessagingTestForm";

/** Owner-only page for sending real test email/Telegram messages and seeing the outcome (spec 029). */
export default async function TestMessagingPage() {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    redirect(`/oauth/login?continue=${encodeURIComponent("/settings/test-messaging")}`);
  }

  const language = await resolveLanguage();
  const dict = getDictionary(language).settings.messagingTest;

  return (
    <Page size="md">
      <PageHeader title={dict.title} description={dict.description} />
      <MessagingTestForm language={language} />
    </Page>
  );
}
