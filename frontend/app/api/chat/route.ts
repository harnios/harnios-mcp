import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { requireOwnerSession } from "@/lib/oauth/session";
import { loadChatContext } from "@/lib/chat/context";
import { errorResponse } from "@/lib/chat/errors";
import { discoverFromClient } from "@/lib/chat/mcpBridge";
import { resolveChatModel } from "@/lib/chat/model";
import { createInProcessMcpClient } from "@/lib/mcp-tools/inProcessClient";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const unauthorized = await requireOwnerSession();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json() as { messages?: unknown };
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return Response.json({ code: "invalid_request", message: "A non-empty message list is required." }, { status: 400 });
    }

    const system = await loadChatContext();
    const model = resolveChatModel();
    const client = await createInProcessMcpClient({ includeExternal: true });
    try {
      const tools = await discoverFromClient(client);
      const result = streamText({
        model,
        system,
        messages: await convertToModelMessages(body.messages as never[]),
        tools,
        stopWhen: stepCountIs(5),
      });
      return result.toUIMessageStreamResponse({
        onFinish: async () => { await client.close().catch(() => undefined); },
        onError: () => { void client.close().catch(() => undefined); return "The chat is temporarily unavailable."; },
      });
    } catch (error) {
      await client.close().catch(() => undefined);
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
