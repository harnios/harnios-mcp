"use client";

/* eslint-disable @next/next/no-img-element -- same-origin public share images need no remote loader. */

import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ShareContentKind } from "@/lib/sharing/contentPolicy";

export function SharePreview({ token, path, kind }: { token: string; path: string; kind: ShareContentKind }) {
  const contentUrl = `/share/${encodeURIComponent(token)}/content`;
  const downloadUrl = `/share/${encodeURIComponent(token)}/download`;
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (kind !== "text" && kind !== "markdown") return;
    fetch(contentUrl, { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load the shared file");
        return response.text();
      })
      .then(setText)
      .catch((err: Error) => setError(err.message));
  }, [contentUrl, kind]);

  if (kind === "unsupported") {
    return <div><p>Preview is not available for this file type.</p><a className="btn btn--secondary" href={downloadUrl}>Download file</a></div>;
  }
  if (error) return <p role="alert">{error}</p>;
  if (kind === "pdf") return <iframe title={path} src={contentUrl} style={{ width: "100%", minHeight: "75vh", border: "1px solid var(--border)" }} />;
  if (kind === "image") return <img src={contentUrl} alt={path} style={{ maxWidth: "100%", maxHeight: "75vh" }} />;
  if (kind === "media") return <video controls src={contentUrl} style={{ maxWidth: "100%" }} />;
  if (text === null) return <p>Loading shared file…</p>;
  if (kind === "markdown") return <article><Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown></article>;
  return <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{text}</pre>;
}
