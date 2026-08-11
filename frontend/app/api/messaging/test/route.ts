import { NextRequest, NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/oauth/session";
import { MessagingError, type MessagingErrorCode } from "@/lib/messaging/errors";
import { sendEmailBatch } from "@/lib/messaging/sendEmail";
import { sendTelegramTextMessage } from "@/lib/messaging/sendTelegram";

interface EmailTestRequest {
  channel: "email";
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

interface TelegramTestRequest {
  channel: "telegram";
  chatId?: string;
  text: string;
}

interface TestResponse {
  channel: "email" | "telegram";
  status: "success" | "failure";
  destination: string;
  errorCode?: MessagingErrorCode;
  errorMessage?: string;
}

function badRequest(message: string) {
  return NextResponse.json({ code: "invalid_request", message }, { status: 400 });
}

/**
 * Sends one real test message (spec 029 contracts/messaging-test-contract.md)
 * through the exact same shared functions the send_email/send_telegram_message
 * MCP tools use (FR-004) — never a parallel implementation. Every outcome,
 * success or failure, is a 200 response; the body's `status` field carries
 * the result. Only a malformed request body is a 400.
 */
export async function POST(request: NextRequest) {
  const authError = await requireOwnerSession();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON");
  }

  if (!body || typeof body !== "object" || !("channel" in body)) {
    return badRequest("channel is required");
  }
  const { channel } = body as { channel: unknown };

  if (channel === "email") {
    const { to, subject, body: emailBody, isHtml } = body as Partial<EmailTestRequest>;
    if (!to || !subject || emailBody === undefined) {
      return badRequest('to, subject, and body are required for channel "email"');
    }

    try {
      const [result] = await sendEmailBatch([to], subject, emailBody, isHtml ?? false);
      const response: TestResponse = {
        channel: "email",
        status: result.status,
        destination: to,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      };
      return NextResponse.json(response);
    } catch (err) {
      const messagingError =
        err instanceof MessagingError ? err : new MessagingError("delivery_failed", (err as Error)?.message ?? String(err));
      const response: TestResponse = {
        channel: "email",
        status: "failure",
        destination: to,
        errorCode: messagingError.code,
        errorMessage: messagingError.message,
      };
      return NextResponse.json(response);
    }
  }

  if (channel === "telegram") {
    const { chatId, text } = body as Partial<TelegramTestRequest>;
    if (!text) {
      return badRequest('text is required for channel "telegram"');
    }

    const result = await sendTelegramTextMessage(chatId, text);
    const response: TestResponse =
      result.status === "success"
        ? { channel: "telegram", status: "success", destination: result.chatId }
        : {
            channel: "telegram",
            status: "failure",
            destination: result.chatId,
            errorCode: result.errorCode,
            errorMessage: result.errorMessage,
          };
    return NextResponse.json(response);
  }

  return badRequest(`Unknown channel "${String(channel)}"`);
}
