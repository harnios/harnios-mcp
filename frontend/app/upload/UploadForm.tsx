"use client";

import { useState } from "react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { SupportedLanguage } from "@/lib/i18n/languages";

type Result = { originalName: string; path: string; size: number; contentType: string };

export default function UploadForm({ language }: { language: SupportedLanguage }) {
  const dict = getDictionary(language).editor.tree;
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setResult(null);
    if (!file) { setError(dict.nothingToUpload); return; }
    setBusy(true);
    try {
      const body = new FormData(); body.append("file", file, file.name);
      const response = await fetch("/api/ingest", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? dict.uploadFailedLabel);
      setResult(data as Result);
    } catch (err) { setError(err instanceof Error ? err.message : dict.uploadFailedLabel); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} style={{ display: "grid", gap: "1rem" }}><input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label={dict.menuUploadFiles} /><button className="btn btn--primary" type="submit" disabled={busy}>{busy ? "…" : dict.menuUploadFiles}</button>{error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}{result && <section aria-live="polite"><p>{dict.uploadSummary(1, 0)}: <strong>{result.originalName}</strong></p><p>Percorso da usare nel job:</p><code style={{ userSelect: "all" }}>{result.path}</code></section>}</form>;
}
