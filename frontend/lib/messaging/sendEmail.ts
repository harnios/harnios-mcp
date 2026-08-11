import { readMessagingConfig, validateEmailConfig } from "./config";
import { sendEmailToRecipient } from "./email";
import { MessagingError, type MessagingErrorCode } from "./errors";
import { checkAndRecordSend } from "./rateLimit";
import { recordSendAttempt } from "./auditLog";
import { isValidEmailAddress } from "./validation";

export interface EmailRecipientResult {
  to: string;
  status: "success" | "failure";
  errorCode?: MessagingErrorCode;
  errorMessage?: string;
}

/**
 * Sends one email to 1-50 recipients, reporting a per-recipient outcome
 * (spec 017 FR-003) — shared by the `send_email` MCP tool and the web test
 * page (spec 029 FR-004), so both go through this exact flow. The rate
 * limit is checked once per call, not once per recipient — a batch of 50
 * recipients consumes one unit, same as a single-recipient call.
 */
export async function sendEmailBatch(to: string[], subject: string, body: string): Promise<EmailRecipientResult[]> {
  if (!subject.trim() || !body.trim()) {
    throw new MessagingError("invalid_message", "subject and body must not be empty");
  }

  const config = readMessagingConfig();
  validateEmailConfig(config);
  await checkAndRecordSend(config);

  const results: EmailRecipientResult[] = [];
  for (const address of to) {
    if (!isValidEmailAddress(address)) {
      const errorCode: MessagingErrorCode = "invalid_recipient";
      const errorMessage = `"${address}" is not a valid email address`;
      await recordSendAttempt({ channel: "email", destination: address, status: "failure", errorCode, errorMessage });
      results.push({ to: address, status: "failure", errorCode, errorMessage });
      continue;
    }

    try {
      await sendEmailToRecipient(address, subject, body, config);
      await recordSendAttempt({ channel: "email", destination: address, status: "success" });
      results.push({ to: address, status: "success" });
    } catch (err) {
      const errorCode: MessagingErrorCode = "delivery_failed";
      const errorMessage = (err as Error)?.message ?? String(err);
      await recordSendAttempt({ channel: "email", destination: address, status: "failure", errorCode, errorMessage });
      results.push({ to: address, status: "failure", errorCode, errorMessage });
    }
  }

  return results;
}
