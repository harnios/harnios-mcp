import { redirect } from "next/navigation";
import { hasActiveOwnerSession } from "@/lib/oauth/session";
import { resolveLanguage } from "@/lib/i18n/resolve";
import UploadForm from "./UploadForm";

export default async function UploadPage() {
  if (!(await hasActiveOwnerSession())) redirect("/oauth/login?continue=/upload");
  return <main style={{ maxWidth: 720, margin: "4rem auto", padding: "0 1.5rem" }}><h1>Upload file</h1><p>Carica un file nello spazio di lavoro. Il contenuto non viene mostrato nella chat.</p><UploadForm language={await resolveLanguage()} /></main>;
}
