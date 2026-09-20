"use client";

import { useState, type FormEvent } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type FileDictionary = Dictionary["editor"]["file"];

export function ShareDialog({ path, dict, onClose }: { path: string; dict: FileDictionary; onClose: () => void }) {
  const [duration, setDuration] = useState("1d");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function createShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const durationMs: Record<string, number> = { "1h": 60 * 60 * 1000, "1d": 24 * 60 * 60 * 1000, "7d": 7 * 24 * 60 * 60 * 1000, "30d": 30 * 24 * 60 * 60 * 1000 };
    try {
      const response = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, expiresAt: new Date(Date.now() + durationMs[duration]).toISOString(), password: password || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Unable to create share");
      setResult(data.url);
      setPassword("");
    } catch (err) {
      setError(dict.shareFailed((err as Error).message));
    }
  }

  async function copyLink() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
  }

  async function shareFile() {
    if (!result || !navigator.share) return;

    const fileName = path.split("/").pop() ?? path;
    await navigator.share({
      title: fileName,
      text: fileName,
      url: result,
    });
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="share-title" style={{ marginTop: 12, padding: 16, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface-raised)" }}>
      <h4 id="share-title">{dict.shareTitle}</h4>
      <p className="muted">{dict.shareDescription}</p>
      {result ? (
        <div style={{ display: "grid", gap: 8 }}>
          <p>{dict.shareLinkCreated}</p>
          <input readOnly value={result} aria-label="Share URL" />
          <div className="cluster">
            <button type="button" className="btn btn--primary" onClick={copyLink}>{copied ? dict.shareCopied : dict.shareCopy}</button>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <button type="button" className="btn btn--secondary" onClick={shareFile}>{dict.shareNative}</button>
            )}
            <button type="button" className="btn btn--secondary" onClick={onClose}>{dict.shareCancel}</button>
          </div>
        </div>
      ) : (
        <form onSubmit={createShare} style={{ display: "grid", gap: 10 }}>
          <label>
            {dict.shareExpiration}
            <select value={duration} onChange={(event) => setDuration(event.target.value)}>
              <option value="1h">1 hour</option>
              <option value="1d">1 day</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
            </select>
          </label>
          <label>
            {dict.sharePassword}
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
          </label>
          <p className="muted">{dict.sharePasswordHint}</p>
          {error && <p role="alert" style={{ color: "var(--danger-fg)" }}>{error}</p>}
          <div className="cluster">
            <button type="submit" className="btn btn--primary">{dict.shareCreate}</button>
            <button type="button" className="btn btn--secondary" onClick={onClose}>{dict.shareCancel}</button>
          </div>
        </form>
      )}
    </div>
  );
}
