"use client";

import { useEffect, useRef, useState } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";

export interface BpmnModelerDialogLabels {
  apply: string;
  cancel: string;
  close: string;
  discardChanges: string;
  exportError: string;
  importError: string;
  loading: string;
  title: string;
}

export interface BpmnModelerDialogProps {
  xml: string;
  labels: BpmnModelerDialogLabels;
  onApply: (xml: string) => void;
  onClose: () => void;
}

type ModelerStatus = "loading" | "ready" | "error" | "exporting";

/** Modal visual BPMN editor. Storage remains owned by FileEditor. */
export function BpmnModelerDialog({ xml, labels, onApply, onClose }: BpmnModelerDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);
  const [status, setStatus] = useState<ModelerStatus>("loading");
  const [dirty, setDirty] = useState(false);
  const [exportError, setExportError] = useState(false);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const modeler = new BpmnModeler({ container: containerRef.current });
    modelerRef.current = modeler;
    let cancelled = false;

    modeler
      .importXML(xml)
      .then(() => {
        if (cancelled) return;
        const canvas = modeler.get("canvas") as { zoom: (level: "fit-viewport") => void };
        canvas.zoom("fit-viewport");
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    const eventBus = modeler.get("eventBus") as { on: (event: string, handler: () => void) => void };
    eventBus.on("commandStack.changed", () => setDirty(true));

    return () => {
      cancelled = true;
      modeler.destroy();
      modelerRef.current = null;
    };
  }, [xml]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  });

  function handleClose() {
    if (dirty && !window.confirm(labels.discardChanges)) return;
    onClose();
  }

  async function handleApply() {
    const modeler = modelerRef.current;
    if (!modeler || status === "exporting") return;

    setStatus("exporting");
    setExportError(false);
    try {
      const result = await modeler.saveXML({ format: true });
      if (!result.xml) throw new Error("Modeler returned no XML");
      onApply(result.xml);
    } catch {
      setExportError(true);
      setStatus("ready");
    }
  }

  return (
    <div className="bpmn-modeler-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && handleClose()}>
      <section className="bpmn-modeler-dialog" role="dialog" aria-modal="true" aria-labelledby="bpmn-modeler-title">
        <header className="bpmn-modeler-dialog__header">
          <h2 id="bpmn-modeler-title">{labels.title}</h2>
          <button ref={closeButtonRef} type="button" className="btn btn--secondary" onClick={handleClose} aria-label={labels.close}>
            ×
          </button>
        </header>
        {status === "loading" && <p className="bpmn-modeler-dialog__message">{labels.loading}</p>}
        {(status === "error" || exportError) && (
          <p className="bpmn-modeler-dialog__error" role="alert">
            {exportError ? labels.exportError : labels.importError}
          </p>
        )}
        <div ref={containerRef} className="bpmn-modeler-dialog__canvas" aria-label={labels.title} />
        <footer className="bpmn-modeler-dialog__footer">
          <button type="button" className="btn btn--secondary" onClick={handleClose}>{labels.cancel}</button>
          <button type="button" className="btn btn--primary" onClick={handleApply} disabled={status !== "ready"}>
            {status === "exporting" ? labels.loading : labels.apply}
          </button>
        </footer>
      </section>
      <style jsx>{`
        .bpmn-modeler-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(0, 0, 0, 0.55);
        }
        .bpmn-modeler-dialog {
          display: flex;
          flex-direction: column;
          width: min(1400px, 100%);
          height: min(900px, 100%);
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--surface-raised);
          box-shadow: var(--shadow-2);
        }
        .bpmn-modeler-dialog__header,
        .bpmn-modeler-dialog__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          background: var(--surface-raised);
        }
        .bpmn-modeler-dialog__header {
          border-bottom: 1px solid var(--border);
        }
        .bpmn-modeler-dialog__header h2 {
          margin: 0;
        }
        .bpmn-modeler-dialog__footer {
          justify-content: flex-end;
          border-top: 1px solid var(--border);
        }
        .bpmn-modeler-dialog__canvas {
          flex: 1;
          min-height: 0;
        }
        .bpmn-modeler-dialog__message,
        .bpmn-modeler-dialog__error {
          margin: 0;
          padding: 8px 16px;
        }
        .bpmn-modeler-dialog__error {
          color: var(--danger-fg);
          background: var(--danger-bg);
        }
        @media (max-width: 768px) {
          .bpmn-modeler-backdrop {
            padding: 0;
          }
          .bpmn-modeler-dialog {
            width: 100%;
            height: 100%;
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  );
}
