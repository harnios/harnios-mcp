import "./globals.css";
import { getOsName } from "@/lib/config/app";
import { resolveLanguage } from "@/lib/i18n/resolve";
import { SiteHeader } from "@/app/_ui/SiteHeader";

export const metadata = {
  title: getOsName(),
  description: "S3 storage MCP server",
};

/** Sets `<html lang>` from the resolved language (spec 015 FR-008) — the
 * confirmed Company OS language once one exists, live browser detection
 * before that, or English for a Company OS that predates this feature
 * (contracts/language-resolution.md). Mounts the shared app header
 * (spec 034), which self-hides on chromeless surfaces. */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const language = await resolveLanguage();

  return (
    <html lang={language}>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
