import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkOsStatus } from "@/lib/os/init";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { verifyStorageConnection } from "@/lib/storage/client";
import { StorageConfigError } from "@/lib/storage/errors";
import { detectBrowserLanguage } from "@/lib/i18n/detect";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { requestOrigin } from "@/lib/http";
import { Page } from "@/app/_ui/Page";
import { PageHeader } from "@/app/_ui/PageHeader";
import { Button } from "@/app/_ui/Button";
import { EnvSetupHelper } from "./EnvSetupHelper";
import { LanguageConfirm } from "./LanguageConfirm";
import { McpConnectManual } from "./McpConnectManual";

/** Bootstraps a fresh Company OS in the configured storage bucket (spec 014). */
export default async function InitPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  try {
    await verifyStorageConnection();
  } catch (err) {
    if (!(err instanceof StorageConfigError)) throw err;

    // No Company OS can exist yet (storage itself isn't reachable), so this
    // uses live browser detection directly rather than resolveLanguage() —
    // which would call checkOsStatus() and fail on the same unreachable
    // storage (spec 015 FR-014, research.md §7).
    const hdrs = await headers();
    const language = detectBrowserLanguage(hdrs.get("accept-language"));

    return (
      <Page size="sm">
        <EnvSetupHelper language={language} connectionErrorMessage={err.message} />
      </Page>
    );
  }

  const signedIn = await hasActiveOwnerSession();
  if (!signedIn) {
    redirect(`/oauth/login?continue=${encodeURIComponent("/init")}`);
  }

  const status = await checkOsStatus();
  const params = await searchParams;
  const language = await resolveLanguage();
  const dict = getDictionary(language);

  if (status === "partial") {
    return (
      <Page size="sm">
        <PageHeader title={dict.init.unexpectedStateTitle} description={dict.init.unexpectedStateBody} />
      </Page>
    );
  }

  if (status === "already_initialized") {
    const hdrs = await headers();
    const mcpUrl = `${requestOrigin({ headers: hdrs })}/mcp`;

    return (
      <Page size="sm">
        <McpConnectManual mcpUrl={mcpUrl} justCreated={params.created === "1"} dict={dict.init.mcpConnect} />
      </Page>
    );
  }

  return (
    <Page size="sm">
      <PageHeader title={dict.init.setupTitle} description={dict.init.setupDescription} />
      <p>{dict.init.languagePrompt}</p>
      <form method="POST" action="/init/submit" className="stack">
        <LanguageConfirm detected={language} />
        <Button type="submit">{dict.init.submit}</Button>
      </form>
    </Page>
  );
}
