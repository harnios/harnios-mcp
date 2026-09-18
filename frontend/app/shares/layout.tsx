import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";

export default async function SharesLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasActiveOwnerSession())) {
    const pathname = (await headers()).get("x-pathname") ?? "/shares";
    redirect(`/oauth/login?continue=${encodeURIComponent(pathname)}`);
  }
  return children;
}
