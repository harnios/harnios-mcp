"use client";

import useSWR from "swr";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { TemporaryShareSummary } from "@/lib/sharing/types";

type ShareManagerDictionary = Pick<
  Dictionary["editor"]["file"],
  | "shareManager"
  | "shareManagerDescription"
  | "shareConfirmRevoke"
  | "shareEmpty"
  | "sharePath"
  | "shareExpires"
  | "shareStatus"
  | "shareProtected"
  | "shareActive"
  | "shareExpired"
  | "shareRevoked"
  | "shareRevoke"
>;

export function ShareManager({ dict }: { dict: ShareManagerDictionary }) {
  const { data: shares, error, isLoading, mutate } = useSWR<TemporaryShareSummary[]>(
    "/api/shares",
    async (url: string) => {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load shares");
      return response.json() as Promise<TemporaryShareSummary[]>;
    },
  );

  async function revoke(id: string) {
    if (!window.confirm(dict.shareConfirmRevoke)) return;
    const response = await fetch(`/api/shares?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      return;
    }
    await mutate();
  }

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p role="alert">{error.message}</p>;
  if (!shares || shares.length === 0) return <p>{dict.shareEmpty}</p>;

  return (
    <table className="table">
      <thead><tr><th>{dict.sharePath}</th><th>{dict.shareExpires}</th><th>{dict.shareStatus}</th><th>{dict.shareProtected}</th><th /></tr></thead>
      <tbody>
        {shares.map((share) => (
          <tr key={share.id}>
            <td><code>{share.path}</code></td>
            <td>{new Date(share.expiresAt).toLocaleString()}</td>
            <td>{share.status === "active" ? dict.shareActive : share.status === "expired" ? dict.shareExpired : dict.shareRevoked}</td>
            <td>{share.passwordProtected ? "✓" : "—"}</td>
            <td>{share.status === "active" && <button type="button" className="btn btn--secondary" onClick={() => revoke(share.id)}>{dict.shareRevoke}</button>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
