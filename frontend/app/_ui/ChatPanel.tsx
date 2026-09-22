"use client";

import { useState } from "react";
import { AssistantRuntimeProvider, ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";

export interface ChatLabels {
  open: string; close: string; title: string; placeholder: string; send: string; thinking: string; error: string;
  approve: string; deny: string; toolRunning: string; toolComplete: string; toolFailed: string;
}

export function ChatPanel({ labels }: { labels: ChatLabels }) {
  const [open, setOpen] = useState(false);
  const runtime = useChatRuntime({ transport: new AssistantChatTransport({ api: "/api/chat" }) });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <button className="chat-launcher" type="button" aria-label={labels.open} onClick={() => setOpen(true)}>
        <span aria-hidden="true">✦</span>
      </button>
      {open ? (
        <section className="chat-panel" role="dialog" aria-modal="false" aria-label={labels.title}>
          <header className="chat-panel__header">
            <h2>{labels.title}</h2>
            <button className="chat-panel__close" type="button" aria-label={labels.close} onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="chat-panel__thread">
            <ThreadPrimitive.Root className="chat-thread">
              <ThreadPrimitive.Viewport className="chat-thread__viewport">
                <ThreadPrimitive.Messages>
                  {() => (
                    <MessagePrimitive.Root className="chat-message">
                      <MessagePrimitive.Content />
                    </MessagePrimitive.Root>
                  )}
                </ThreadPrimitive.Messages>
                <ThreadPrimitive.ViewportFooter>
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
