import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { HomeLink } from "@/app/HomeLink";
import { MessagingTestForm } from "./MessagingTestForm";

/** Owner-only page for sending real test email/Telegram messages and seeing the outcome (spec 029). */
export default async function TestMessagingPage() {
  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    redirect(`/oauth/login?continue=${encodeURIComponent("/settings/test-messaging")}`);
  }

  const language = await resolveLanguage();
  const fullDict = getDictionary(language);
  const dict = fullDict.settings.messagingTest;

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <HomeLink label={fullDict.common.homeLink} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1>{dict.title}</h1>
        <form method="POST" action="/oauth/logout">
          <button type="submit">{dict.signOut}</button>
        </form>
      </div>
      <p>{dict.description}</p>
      <MessagingTestForm language={language} />
    </main>
  );
}
