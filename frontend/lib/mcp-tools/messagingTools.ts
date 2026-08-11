import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { MessagingError } from "@/lib/messaging/errors";
import { sendEmailBatch } from "@/lib/messaging/sendEmail";
import { sendTelegramTextMessage } from "@/lib/messaging/sendTelegram";
import { z } from "zod";
import { ok } from "./result";
import { registerGatedTool } from "./toolGate";

/**
 * Wraps a MessagingError as an MCP `isError` result with the same
 * `{ code, message }` shape as lib/mcp-tools/result.ts's errorResult(), so
 * callers use one parsing convention across every tool in this server
 * (research.md §6). Non-MessagingError failures are reported as
 * `delivery_failed` rather than leaking an unstructured message.
 */
function messagingErrorResult(err: unknown): CallToolResult {
  const messagingError = err instanceof MessagingError
    ? err
    : new MessagingError("delivery_failed", (err as Error)?.message ?? String(err));
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify({ code: messagingError.code, message: messagingError.message }) }],
  };
}

/** Registers the send_email and send_telegram_message MCP tools (spec 017). */
export async function registerMessagingTools(server: McpServer, disabledTools: ReadonlySet<string>): Promise<void> {
  registerGatedTool(
    server,
    disabledTools,
    "send_email",
    {
      title: "Send Email",
      description:
        "Sends an email via the pre-configured SMTP account to 1-50 recipients. Reports a " +
        "per-recipient outcome, so a mix of valid and invalid addresses doesn't fail the whole " +
        "call. Uses the server's configured sender identity — no per-call credentials.",
      inputSchema: {
        to: z.array(z.string()).min(1).max(50).describe("1-50 recipient email addresses"),
        subject: z.string().describe("Email subject"),
        body: z.string().describe("Email body (plain text, or HTML markup when isHtml is true)"),
        isHtml: z
          .boolean()
          .optional()
          .describe(
            "Whether body is HTML instead of plain text. Defaults to false. When true, a plain-text " +
              "alternative is generated automatically for non-HTML mail clients.",
          ),
      },
    },
    async ({ to, subject, body, isHtml }) => {
      try {
        const results = await sendEmailBatch(to, subject, body, isHtml ?? false);
        return ok({ results });
      } catch (err) {
        return messagingErrorResult(err);
      }
    },
  );

  registerGatedTool(
    server,
    disabledTools,
    "send_telegram_message",
    {
      title: "Send Telegram Message",
      description:
        "Sends a text message via the pre-configured Telegram bot to a target chat/channel. If " +
        "chatId is omitted, sends to the server's configured default chat (TELEGRAM_CHAT_ID). " +
        "The bot must already be a member of the target chat. Uses the server's configured bot " +
        "token — no per-call credentials.",
      inputSchema: {
        chatId: z
          .string()
          .min(1)
          .optional()
          .describe('Telegram chat/channel identifier, e.g. "123456789" or "@channelname". Omit to use the server\'s default configured chat.'),
        text: z.string().min(1).max(4096).describe("Message text (max 4096 characters)"),
      },
    },
    async ({ chatId, text }) => {
      try {
        const result = await sendTelegramTextMessage(chatId, text);
        if (result.status === "failure") {
          return messagingErrorResult(new MessagingError(result.errorCode, result.errorMessage));
        }
        return ok({ chatId: result.chatId, status: "success" });
      } catch (err) {
        return messagingErrorResult(err);
      }
    },
  );
}
