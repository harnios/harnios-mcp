"use client";

import { useState } from "react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Dictionary } from "@/lib/i18n/dictionaries/types";
import type { SupportedLanguage } from "@/lib/i18n/languages";

type Dict = Dictionary["settings"]["messagingTest"];

interface TestResponse {
  channel: "email" | "telegram";
  status: "success" | "failure";
  destination: string;
  errorCode?: string;
  errorMessage?: string;
}

interface TestAttempt {
  channel: "email" | "telegram";
  destination: string;
  timestamp: string;
  result: TestResponse;
}

const MAX_RECENT_ATTEMPTS = 10;
const MAX_TELEGRAM_TEXT_LENGTH = 4096;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Server-component primitives can't be imported into a "use client" file
// (spec 034), so this uses the shared CSS classes directly.
const fieldStyle: React.CSSProperties = { marginBottom: "var(--space-2)" };
const hintStyle: React.CSSProperties = { fontSize: "var(--text-sm)", margin: "0 0 var(--space-2)" };

function ResultBanner({ dict, result }: { dict: Dict; result: TestResponse }) {
  const isSuccess = result.status === "success";
  return (
    <p role="alert" className={`banner banner--${isSuccess ? "success" : "danger"}`}>
      {isSuccess ? dict.success(result.destination) : dict.failure(result.errorCode ?? "delivery_failed", result.errorMessage ?? "")}
    </p>
  );
}

async function postTest(payload: Record<string, unknown>): Promise<TestResponse> {
  const response = await fetch("/api/messaging/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await response.json()) as TestResponse;
}

export function MessagingTestForm({ language }: { language: SupportedLanguage }) {
  const dict = getDictionary(language).settings.messagingTest;

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailIsHtml, setEmailIsHtml] = useState(false);
  const [emailPending, setEmailPending] = useState(false);
  const [emailResult, setEmailResult] = useState<TestResponse | null>(null);
  const [emailValidationError, setEmailValidationError] = useState<string | null>(null);

  const [chatId, setChatId] = useState("");
  const [text, setText] = useState("");
  const [telegramPending, setTelegramPending] = useState(false);
  const [telegramResult, setTelegramResult] = useState<TestResponse | null>(null);
  const [telegramValidationError, setTelegramValidationError] = useState<string | null>(null);

  const [recentAttempts, setRecentAttempts] = useState<TestAttempt[]>([]);

  function recordAttempt(channel: "email" | "telegram", destination: string, result: TestResponse) {
    setRecentAttempts((prev) =>
      [{ channel, destination, timestamp: new Date().toISOString(), result }, ...prev].slice(0, MAX_RECENT_ATTEMPTS),
    );
  }

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setEmailResult(null);

    if (!EMAIL_PATTERN.test(to.trim())) {
      setEmailValidationError(dict.email.invalidRecipient);
      return;
    }
    if (!subject.trim() || !emailBody.trim()) {
      setEmailValidationError(dict.email.emptyFields);
      return;
    }
    setEmailValidationError(null);

    setEmailPending(true);
    try {
      const result = await postTest({ channel: "email", to: to.trim(), subject, body: emailBody, isHtml: emailIsHtml });
      setEmailResult(result);
      recordAttempt("email", to.trim(), result);
    } finally {
      setEmailPending(false);
    }
  }

  async function handleTelegramSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTelegramResult(null);

    if (!text.trim() || text.length > MAX_TELEGRAM_TEXT_LENGTH) {
      setTelegramValidationError(dict.telegram.emptyText);
      return;
    }
    setTelegramValidationError(null);

    setTelegramPending(true);
    try {
      const result = await postTest({ channel: "telegram", chatId: chatId.trim() || undefined, text });
      setTelegramResult(result);
      recordAttempt("telegram", result.destination, result);
    } finally {
      setTelegramPending(false);
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <h2>{dict.email.sectionTitle}</h2>
        <form onSubmit={handleEmailSubmit}>
          <label>
            {dict.email.toLabel}
            <input
              className="input"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={dict.email.toPlaceholder}
              style={fieldStyle}
              required
            />
          </label>
          <label>
            {dict.email.subjectLabel}
            <input
              className="input"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={dict.email.subjectPlaceholder}
              style={fieldStyle}
              required
            />
          </label>
          <label>
            {dict.email.bodyLabel}
            <textarea
              className="input"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder={dict.email.bodyPlaceholder}
              rows={3}
              style={fieldStyle}
              required
            />
          </label>
          <label className="field field--inline">
            <input type="checkbox" checked={emailIsHtml} onChange={(e) => setEmailIsHtml(e.target.checked)} />
            {dict.email.htmlToggle}
          </label>
          <button type="submit" className="btn btn--primary" disabled={emailPending}>
            {emailPending ? dict.email.sending : dict.email.submit}
          </button>
        </form>
        {emailValidationError && <ResultBanner dict={dict} result={{ channel: "email", status: "failure", destination: to, errorCode: "invalid_message", errorMessage: emailValidationError }} />}
        {emailResult && <ResultBanner dict={dict} result={emailResult} />}
      </section>

      <section className="card">
        <h2>{dict.telegram.sectionTitle}</h2>
        <form onSubmit={handleTelegramSubmit}>
          <label>
            {dict.telegram.chatIdLabel}
            <input
              className="input"
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder={dict.telegram.chatIdPlaceholder}
              style={fieldStyle}
            />
          </label>
          <p className="muted" style={hintStyle}>{dict.telegram.chatIdHint}</p>
          <label>
            {dict.telegram.textLabel}
            <textarea
              className="input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={dict.telegram.textPlaceholder}
              rows={3}
              maxLength={MAX_TELEGRAM_TEXT_LENGTH}
              style={fieldStyle}
              required
            />
          </label>
          <p className="muted" style={hintStyle}>
            {dict.telegram.charCount(text.length, MAX_TELEGRAM_TEXT_LENGTH)}
          </p>
          <button type="submit" className="btn btn--primary" disabled={telegramPending}>
            {telegramPending ? dict.telegram.sending : dict.telegram.submit}
          </button>
        </form>
        {telegramValidationError && <ResultBanner dict={dict} result={{ channel: "telegram", status: "failure", destination: chatId, errorCode: "invalid_message", errorMessage: telegramValidationError }} />}
        {telegramResult && <ResultBanner dict={dict} result={telegramResult} />}
      </section>

      <section>
        <h2>{dict.recent.heading}</h2>
        {recentAttempts.length === 0 ? (
          <p>{dict.recent.empty}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{dict.recent.channel}</th>
                <th>{dict.recent.destination}</th>
                <th>{dict.recent.time}</th>
                <th>{dict.recent.outcome}</th>
              </tr>
            </thead>
            <tbody>
              {recentAttempts.map((attempt, index) => (
                <tr key={index}>
                  <td>{attempt.channel}</td>
                  <td>{attempt.destination}</td>
                  <td>{new Date(attempt.timestamp).toLocaleString()}</td>
                  <td>
                    {attempt.result.status === "success" ? dict.recent.outcomeSuccess : dict.recent.outcomeFailure}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
