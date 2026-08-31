"use client";

import type { Dictionary } from "@/lib/i18n/dictionaries";

/**
 * Non-blocking notice shown when the file open in the editor changed
 * externally while the user has unsaved edits (spec 019 US2, FR-005) — never
 * replaces the editor's content on its own, only offers an explicit choice.
 *
 * Uses the shared `.banner` / `.btn` classes (spec 034) rather than the
 * <Banner>/<Button> server components, which can't be imported here.
 */
export function ExternalChangeBanner({
  onReload,
  onKeepMine,
  dict,
}: {
  onReload: () => void;
  onKeepMine: () => void;
  dict: Dictionary["editor"]["file"];
}) {
  return (
    <div role="alert" className="banner banner--warning cluster">
      <span>{dict.externalChangeMessage}</span>
      <button type="button" className="btn btn--ghost" onClick={onReload}>
        {dict.externalChangeReload}
      </button>
      <button type="button" className="btn btn--ghost" onClick={onKeepMine}>
        {dict.externalChangeKeepMine}
      </button>
    </div>
  );
}
