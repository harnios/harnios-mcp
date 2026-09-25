import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { requireOwnerSession } from "@/lib/oauth/session";
import { loadChatContext } from "@/lib/chat/context";
import { errorResponse } from "@/lib/chat/errors";
import { discoverFromClient } from "@/lib/chat/mcpBridge";
import { isChatMode, type ChatMode } from "@/lib/chat/mode";
import { resolveChatModel } from "@/lib/chat/model";
import { callTool, createInProcessMcpClient } from "@/lib/mcp-tools/inProcessClient";

export const runtime = "nodejs";

function isNewUserTurn(messages: unknown[]): boolean {
  const lastMessage = messages.at(-1);
  return typeof lastMessage === "object" && lastMessage !== null && "role" in lastMessage && lastMessage.role === "user";
}

export async function POST(request: Request): Promise<Response> {
  const unauthorized = await requireOwnerSession();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json() as { messages?: unknown; mode?: unknown };
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return Response.json({ code: "invalid_request", message: "A non-empty message list is required." }, { status: 400 });
    }
    let mode: ChatMode;
    if (body.mode === undefined) mode = "harnios";
    else if (isChatMode(body.mode)) mode = body.mode;
    else {
      return Response.json({ code: "invalid_request", message: "The selected chat mode is not supported." }, { status: 400 });
    }

    const system = await loadChatContext(mode);
    const model = resolveChatModel();
    const messages = await convertToModelMessages(body.messages as never[]);

    if (mode === "general") {
      const result = streamText({ model, system, messages });
      return result.toUIMessageStreamResponse({ onError: () => "The chat is temporarily unavailable." });
    }

    const client = await createInProcessMcpClient({ includeExternal: true });
    try {
      const tools = await discoverFromClient(client);
      if (Object.keys(tools).length === 0) throw new Error("No Harnios MCP tools are available.");
      if (!Object.hasOwn(tools, "read_file")) throw new Error("The required AGENTS.md tool is unavailable.");
      if (isNewUserTurn(body.messages)) {
        const bootstrap = await callTool(client, "read_file", { path: "AGENTS.md" });
        if (bootstrap.isError) throw new Error("AGENTS.md could not be loaded.");
      }
      const result = streamText({
        model,
        system,
        messages,
        tools,
        stopWhen: stepCountIs(5),
        prepareStep: () => ({ toolChoice: "auto" }),
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
