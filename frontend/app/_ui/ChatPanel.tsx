"use client";

import { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AssistantRuntimeProvider, AuiIf, ComposerPrimitive, MessagePrimitive, ThreadPrimitive, useAui, useAuiState } from "@assistant-ui/react";
import type { TextMessagePartProps, ToolCallMessagePartProps } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import type { UIMessage } from "ai";
import type { ChatMode } from "@/lib/chat/mode";

export interface ChatLabels {
  open: string; close: string; title: string; placeholder: string; send: string; thinking: string; error: string; maximize: string; restore: string;
  toolRunning: string; toolComplete: string; toolFailed: string; toolPending: string; toolInput: string; toolResult: string;
  stop: string; reset: string;
  modeLabel: string; modeHarnios: string; modeGeneral: string; modeLocked: string;
}

class ModeChatTransport extends AssistantChatTransport<UIMessage> {
  private readonly requestState: { mode: ChatMode };

  constructor() {
    const requestState: { mode: ChatMode } = { mode: "harnios" };
    super({ api: "/api/chat", body: () => ({ mode: requestState.mode }) });
    this.requestState = requestState;
  }

  setMode(mode: ChatMode) {
    this.requestState.mode = mode;
  }
}

function MarkdownText({ text }: TextMessagePartProps) {
  return (
    <div className="chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

function ToolCallMessage({ labels, ...part }: ToolCallMessagePartProps & { labels: ChatLabels }) {
  const { toolName, args, result, isError, status } = part;
  const argsPreview = JSON.stringify(args ?? {}, null, 2);
  const isWaiting = status.type === "running";
  const resultPreview = result === undefined
    ? null
    : typeof result === "string"
      ? result
      : JSON.stringify(result, null, 2);

  return (
    <div className="chat-tool" role="status">
      <div className="chat-tool__title">
        <span className={`chat-tool__indicator${isWaiting ? " chat-tool__indicator--running" : ""}`} aria-hidden="true" />
        <strong>{toolName}</strong>
        <span className="chat-tool__status">
          {isWaiting ? labels.toolRunning : isError ? labels.toolFailed : result === undefined ? labels.toolPending : labels.toolComplete}
        </span>
      </div>
      {argsPreview !== "{}" ? (
        <details className="chat-tool__result">
          <summary>{labels.toolInput}</summary>
          <pre>{argsPreview}</pre>
        </details>
      ) : null}
      {resultPreview !== null ? (
        <details className="chat-tool__result">
          <summary>{labels.toolResult}</summary>
          <pre>{resultPreview}</pre>
        </details>
      ) : null}
    </div>
  );
}

function ModeSelector({ labels, mode, onChange }: { labels: ChatLabels; mode: ChatMode; onChange: (mode: ChatMode) => void }) {
  const locked = useAuiState((state) => state.thread.isRunning);

  return (
    <div className="chat-mode" role="group" aria-label={labels.modeLabel} title={locked ? labels.modeLocked : undefined}>
      <button className={mode === "harnios" ? "chat-mode__option chat-mode__option--active" : "chat-mode__option"} type="button" aria-pressed={mode === "harnios"} disabled={locked} onClick={() => onChange("harnios")}>
        {labels.modeHarnios}
      </button>
      <button className={mode === "general" ? "chat-mode__option chat-mode__option--active" : "chat-mode__option"} type="button" aria-pressed={mode === "general"} disabled={locked} onClick={() => onChange("general")}>
        {labels.modeGeneral}
      </button>
    </div>
  );
}

function ModelActivity({ label }: { label: string }) {
  const isRunning = useAuiState((state) => state.thread.isRunning);
  if (!isRunning) return null;

  return (
    <div className="chat-status" role="status" aria-live="polite">
      <span className="chat-status__dots" aria-hidden="true"><i /><i /><i /></span>
      {label}
    </div>
  );
}

function ChatActions({ labels }: { labels: ChatLabels }) {
  const aui = useAui();

  return (
    <div className="chat-panel__actions">
      <button className="chat-panel__action" type="button" aria-label={labels.reset} title={labels.reset} onClick={() => aui.thread.reset()}>
        <span aria-hidden="true">↺</span>
      </button>
    </div>
  );
}

function ComposerStop({ labels }: { labels: ChatLabels }) {
  const aui = useAui();

  return (
    <button className="chat-composer__send chat-composer__stop" type="button" aria-label={labels.stop} title={labels.stop} onClick={() => aui.thread.cancelRun()}>
      <span aria-hidden="true">■</span>
    </button>
  );
}

export function ChatPanel({ labels }: { labels: ChatLabels }) {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("harnios");
  const [transport] = useState(() => new ModeChatTransport());
  const runtime = useChatRuntime({
    transport,
  });
  const ToolRenderer = useCallback((props: ToolCallMessagePartProps) => <ToolCallMessage {...props} labels={labels} />, [labels]);
  const changeMode = useCallback((nextMode: ChatMode) => {
    transport.setMode(nextMode);
    setMode(nextMode);
  }, [transport]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <button className="chat-launcher" type="button" aria-label={labels.open} onClick={() => setOpen(true)}>
        <span aria-hidden="true">✦</span>
      </button>
      {open ? (
        <section className={`chat-panel${fullscreen ? " chat-panel--fullscreen" : ""}`} role="dialog" aria-modal="false" aria-label={labels.title}>
          <header className="chat-panel__header">
            <h2>{labels.title}</h2>
            <ModeSelector labels={labels} mode={mode} onChange={changeMode} />
            <ChatActions labels={labels} />
            <div className="chat-panel__actions">
              <button className="chat-panel__action" type="button" aria-label={fullscreen ? labels.restore : labels.maximize} onClick={() => setFullscreen((value) => !value)}>
                {fullscreen ? "↙" : "□"}
              </button>
              <button className="chat-panel__close" type="button" aria-label={labels.close} onClick={() => setOpen(false)}>×</button>
            </div>
          </header>
          <div className="chat-panel__thread">
            <ThreadPrimitive.Root className="chat-thread">
              <ThreadPrimitive.Viewport className="chat-thread__viewport">
                <ThreadPrimitive.Messages>
                  {({ message }) => (
                    <MessagePrimitive.Root className={`chat-message chat-message--${message.role}`}>
                      <MessagePrimitive.Content components={{ Text: MarkdownText, tools: { Fallback: ToolRenderer } }} />
                    </MessagePrimitive.Root>
                  )}
                </ThreadPrimitive.Messages>
                <AuiIf condition={(state) => state.thread.isRunning}>
                  <ModelActivity label={labels.thinking} />
                </AuiIf>
                <ThreadPrimitive.ViewportFooter className="chat-composer-footer">
                  <ComposerPrimitive.Root className="chat-composer">
                    <ComposerPrimitive.Input className="chat-composer__input" placeholder={labels.placeholder} />
                    <AuiIf condition={(state) => state.thread.isRunning}>
                      <ComposerStop labels={labels} />
                    </AuiIf>
                    <AuiIf condition={(state) => !state.thread.isRunning}>
                      <ComposerPrimitive.Send className="chat-composer__send">{labels.send}</ComposerPrimitive.Send>
                    </AuiIf>
                  </ComposerPrimitive.Root>
                </ThreadPrimitive.ViewportFooter>
              </ThreadPrimitive.Viewport>
            </ThreadPrimitive.Root>
          </div>
        </section>
      ) : null}
    </AssistantRuntimeProvider>
  );
}
