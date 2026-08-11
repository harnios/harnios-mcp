import nodemailer from "nodemailer";
import { convert } from "html-to-text";
import type { MessagingConfig } from "./config";

/**
 * Sends one email via the configured SMTP account (research.md §1). Any
 * error thrown by nodemailer propagates unchanged to the caller, which
 * wraps it as a `delivery_failed` MessagingError (contracts/mcp-tools-messaging.md).
 *
 * When `isHtml` is true, `body` is sent as the message's HTML part with an
 * automatically-derived plain-text alternative (spec 030 FR-002, FR-003,
 * research.md §2, §3) — `html-to-text` tolerates malformed markup, so a
 * broken tag never blocks delivery (FR-006). When false (the default),
 * this is byte-for-byte the same call as before spec 030 existed (FR-004).
 */
export async function sendEmailToRecipient(
  to: string,
  subject: string,
  body: string,
  config: MessagingConfig,
  isHtml: boolean,
): Promise<void> {
  const transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: { user: config.smtpUser, pass: config.smtpPassword },
  });

  if (isHtml) {
    await transport.sendMail({
      from: config.smtpFrom,
      to,
      subject,
      html: body,
      text: convert(body),
    });
    return;
  }

  await transport.sendMail({
    from: config.smtpFrom,
    to,
    subject,
    text: body,
  });
}
