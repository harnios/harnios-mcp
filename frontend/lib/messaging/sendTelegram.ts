import { readMessagingConfig, validateTelegramConfig } from "./config";
import { MessagingError, type MessagingErrorCode } from "./errors";
import { checkAndRecordSend } from "./rateLimit";
import { recordSendAttempt } from "./auditLog";
import { sendTelegramMessage } from "./telegram";
import { isValidMessageLength } from "./validation";

export type TelegramSendOutcome = { chatId: string } & (
  | { status: "success" }
  | { status: "failure"; errorCode: MessagingErrorCode; errorMessage: string }
);

/**
 * Sends one text message to a Telegram chat, returning the outcome rather
 * than throwing — shared by the `send_telegram_message` MCP tool and the
 * web test page (spec 029 FR-004). Unlike email, this call is already
 * exactly one message per invocation, so the whole flow (config, rate
 * limit, send, audit) lives in one function with no batching concern.
 */
export async function sendTelegramTextMessage(
  chatId: string | undefined,
  text: string,
): Promise<TelegramSendOutcome> {
  const config = readMessagingConfig();
  const targetChatId = chatId ?? config.telegramChatId ?? "";

  function failure(errorCode: MessagingErrorCode, errorMessage: string): TelegramSendOutcome {
    return { chatId: targetChatId, status: "failure", errorCode, errorMessage };
  }

  if (!isValidMessageLength(text, 4096)) {
    return failure("invalid_message", "text must be non-empty and at most 4096 characters");
  }

  try {
    validateTelegramConfig(config);
  } catch (err) {
    return failure("missing_config", (err as MessagingError).message);
  }

  if (!targetChatId) {
    return failure("missing_config", "No chatId was provided and no default is configured (TELEGRAM_CHAT_ID)");
  }

  try {
    await checkAndRecordSend(config);
  } catch (err) {
    return failure("rate_limited", (err as MessagingError).message);
  }

  try {
    await sendTelegramMessage(targetChatId, text, config);
    await recordSendAttempt({ channel: "telegram", destination: targetChatId, status: "success" });
    return { chatId: targetChatId, status: "success" };
  } catch (err) {
    const errorCode: MessagingErrorCode = err instanceof MessagingError ? err.code : "delivery_failed";
    const errorMessage = (err as Error)?.message ?? String(err);
    await recordSendAttempt({ channel: "telegram", destination: targetChatId, status: "failure", errorCode, errorMessage });
    return { chatId: targetChatId, status: "failure", errorCode, errorMessage };
  }
}
