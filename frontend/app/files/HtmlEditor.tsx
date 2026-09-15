"use client";

import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";

export interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Which single view to show — never both at once. Toggled by the caller. */
  mode: "preview" | "edit";
}

const extensions = [html()];

/**
 * Single-view HTML editor, mirroring MarkdownEditor: either a rendered
 * preview or the raw-source CodeMirror editor, never both at once.
 *
 * The preview is a sandboxed `<iframe srcDoc>` with only `allow-popups` —
 * deliberately *not* `allow-scripts` or `allow-same-origin`. `/api/file`
 * (which feeds `value` here) already returns any text file's raw content
 * regardless of type, but this app's one other HTML-rendering path
 * (`GET /api/file/download`) refuses to render HTML inline for exactly this
 * reason: serving a stored `.html` file with script execution would be a
 * stored-XSS hole under this app's own origin (spec 028 research.md §5).
 * A sandboxed iframe with no script/same-origin grant renders the markup
 * and CSS — which is what a generated report/table file like this is
 * actually for — while any embedded `<script>` simply doesn't run, and the
 * frame has no access to this app's cookies, DOM, or API. `allow-popups` is
 * kept so an in-page link (e.g. `target="_blank"`) can still open a new tab
 * instead of silently failing.
 */
export function HtmlEditor({ value, onChange, mode }: HtmlEditorProps) {
  if (mode === "preview") {
    return (
      <iframe
        title="HTML preview"
        srcDoc={value}
        sandbox="allow-popups"
        style={{ width: "100%", height: "70vh", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "#fff" }}
      />
    );
  }

  return <CodeMirror value={value} height="60vh" theme={oneDark} extensions={extensions} onChange={onChange} />;
}
