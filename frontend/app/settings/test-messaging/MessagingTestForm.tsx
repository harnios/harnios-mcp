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

const fieldStyle: React.CSSProperties = { display: "block", width: "100%", marginBottom: "0.5rem", padding: "0.4rem" };
const sectionStyle: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 6, padding: "1rem", marginBottom: "1rem" };

function ResultBanner({ dict, result }: { dict: Dict; result: TestResponse }) {
  const isSuccess = result.status === "success";
  return (
    <p
      style={{
        marginTop: "0.5rem",
        padding: "0.5rem 0.75rem",
        borderRadius: 4,
        background: isSuccess ? "#e6f4ea" : "#fdecea",
        color: isSuccess ? "#1e4620" : "#611a15",
      }}
    >
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
    <div>
      <section style={sectionStyle}>
        <h2>{dict.email.sectionTitle}</h2>
        <form onSubmit={handleEmailSubmit}>
          <label>
            {dict.email.toLabel}
            <input
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
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder={dict.email.bodyPlaceholder}
              rows={3}
              style={fieldStyle}
              required
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
            <input type="checkbox" checked={emailIsHtml} onChange={(e) => setEmailIsHtml(e.target.checked)} />
            {dict.email.htmlToggle}
          </label>
          <button type="submit" disabled={emailPending}>
            {emailPending ? dict.email.sending : dict.email.submit}
          </button>
        </form>
        {emailValidationError && <ResultBanner dict={dict} result={{ channel: "email", status: "failure", destination: to, errorCode: "invalid_message", errorMessage: emailValidationError }} />}
        {emailResult && <ResultBanner dict={dict} result={emailResult} />}
      </section>

      <section style={sectionStyle}>
        <h2>{dict.telegram.sectionTitle}</h2>
        <form onSubmit={handleTelegramSubmit}>
          <label>
            {dict.telegram.chatIdLabel}
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder={dict.telegram.chatIdPlaceholder}
              style={fieldStyle}
            />
          </label>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "#666" }}>{dict.telegram.chatIdHint}</p>
          <label>
            {dict.telegram.textLabel}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={dict.telegram.textPlaceholder}
              rows={3}
              maxLength={MAX_TELEGRAM_TEXT_LENGTH}
              style={fieldStyle}
              required
            />
          </label>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "#666" }}>
            {dict.telegram.charCount(text.length, MAX_TELEGRAM_TEXT_LENGTH)}
          </p>
          <button type="submit" disabled={telegramPending}>
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
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "0.4rem", borderBottom: "1px solid #ddd" }}>{dict.recent.channel}</th>
                <th style={{ textAlign: "left", padding: "0.4rem", borderBottom: "1px solid #ddd" }}>{dict.recent.destination}</th>
                <th style={{ textAlign: "left", padding: "0.4rem", borderBottom: "1px solid #ddd" }}>{dict.recent.time}</th>
                <th style={{ textAlign: "left", padding: "0.4rem", borderBottom: "1px solid #ddd" }}>{dict.recent.outcome}</th>
              </tr>
            </thead>
            <tbody>
              {recentAttempts.map((attempt, index) => (
                <tr key={index}>
                  <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee" }}>{attempt.channel}</td>
                  <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee" }}>{attempt.destination}</td>
                  <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee" }}>{new Date(attempt.timestamp).toLocaleString()}</td>
                  <td style={{ padding: "0.4rem", borderBottom: "1px solid #eee" }}>
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
