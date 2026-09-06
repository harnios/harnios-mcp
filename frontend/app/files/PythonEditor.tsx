"use client";

import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";

export interface PythonEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const extensions = [python()];

/** CodeMirror editor for `.py` files (spec 037's run_python tool made these a
 * first-class content type) — syntax highlighting on a dark theme, matching
 * how a code editor is expected to look rather than the plain-textarea
 * fallback every other non-Markdown/CSV file still gets. */
export function PythonEditor({ value, onChange }: PythonEditorProps) {
  return <CodeMirror value={value} height="60vh" theme={oneDark} extensions={extensions} onChange={onChange} />;
}
