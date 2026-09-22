import { headers } from "next/headers";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { ChatPanel } from "./ChatPanel";

const EXCLUDED_PREFIXES = ["/oauth", "/init", "/share"];

export async function ChatShell() {
  if (!(await hasActiveOwnerSession())) return null;
  const pathname = (await headers()).get("x-pathname") || "/";
  if (EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return null;
  const dictionary = getDictionary(await resolveLanguage());
  return <ChatPanel labels={dictionary.chat} />;
}
