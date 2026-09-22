"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AssistantRuntimeProvider, ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from "@assistant-ui/react";
import type { TextMessagePartProps } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";

export interface ChatLabels {
  open: string; close: string; title: string; placeholder: string; send: string; thinking: string; error: string; maximize: string; restore: string;
  approve: string; deny: string; toolRunning: string; toolComplete: string; toolFailed: string;
}

function MarkdownText({ text }: TextMessagePartProps) {
  return (
    <div className="chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

export function ChatPanel({ labels }: { labels: ChatLabels }) {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const runtime = useChatRuntime({ transport: new AssistantChatTransport({ api: "/api/chat" }) });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <button className="chat-launcher" type="button" aria-label={labels.open} onClick={() => setOpen(true)}>
        <span aria-hidden="true">✦</span>
      </button>
      {open ? (
        <section className={`chat-panel${fullscreen ? " chat-panel--fullscreen" : ""}`} role="dialog" aria-modal="false" aria-label={labels.title}>
          <header className="chat-panel__header">
            <h2>{labels.title}</h2>
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
                      <MessagePrimitive.Content components={{ Text: MarkdownText }} />
                    </MessagePrimitive.Root>
                  )}
                </ThreadPrimitive.Messages>
                <ThreadPrimitive.ViewportFooter className="chat-composer-footer">
                  <ComposerPrimitive.Root className="chat-composer">
                    <ComposerPrimitive.Input className="chat-composer__input" placeholder={labels.placeholder} />
                    <ComposerPrimitive.Send className="chat-composer__send">{labels.send}</ComposerPrimitive.Send>
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
