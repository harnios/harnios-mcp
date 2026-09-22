"use client";

import { useEffect, useRef, useState } from "react";
import BpmnJS from "bpmn-js/lib/Viewer";

export interface BpmnViewerProps {
  xml: string;
  loadingMessage: string;
  errorMessage: string;
}

/**
 * Browser-only BPMN renderer. The XML remains owned by FileEditor; this
 * component only owns the bpmn-js instance and its transient viewport.
 */
export function BpmnViewer({ xml, loadingMessage, errorMessage }: BpmnViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<BpmnJS | null>(null);
  const [status, setStatus] = useState<"idle" | "importing" | "rendered" | "error">("idle");

  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = new BpmnJS({ container: containerRef.current });
    viewerRef.current = viewer;
    let cancelled = false;

    setStatus("importing");
    viewer
      .importXML(xml)
      .then(() => {
        if (cancelled) return;
        const canvas = viewer.get("canvas") as { zoom: (level: "fit-viewport") => void };
        canvas.zoom("fit-viewport");
        setStatus("rendered");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [xml]);

  return (
    <div className="bpmn-viewer" aria-busy={status === "importing"}>
      {status === "importing" && <p className="bpmn-viewer__status">{loadingMessage}</p>}
      {status === "error" && (
        <p className="bpmn-viewer__error" role="alert">
          {errorMessage}
        </p>
      )}
      <div ref={containerRef} className="bpmn-viewer__canvas" aria-label="BPMN diagram" />
      <style jsx>{`
        .bpmn-viewer {
          position: relative;
          min-height: 60vh;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          background: var(--surface-raised);
        }
        .bpmn-viewer__canvas {
          width: 100%;
          height: 60vh;
          min-height: 360px;
        }
        .bpmn-viewer__status,
        .bpmn-viewer__error {
          position: absolute;
          z-index: 1;
          top: 12px;
          left: 12px;
          right: 12px;
          margin: 0;
          padding: 8px 12px;
          border-radius: var(--radius);
          background: var(--surface-raised);
          box-shadow: var(--shadow-1);
        }
        .bpmn-viewer__error {
          color: var(--danger-fg);
        }
      `}</style>
    </div>
  );
}
