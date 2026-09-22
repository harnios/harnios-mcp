export type ChatErrorCode = "unauthorized" | "invalid_request" | "approval_required" | "chat_unavailable" | "provider_unreachable";

export class ChatError extends Error {
  constructor(public readonly code: ChatErrorCode, message: string, public readonly status = 500) {
    super(message);
    this.name = "ChatError";
  }
}

export function publicChatError(error: unknown): ChatError {
  if (error instanceof ChatError) return error;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("timeout") || message.includes("fetch") || message.includes("network")) {
    return new ChatError("provider_unreachable", "The model or tool provider could not be reached.", 502);
  }
  return new ChatError("chat_unavailable", "The chat is temporarily unavailable.", 500);
}

export function errorResponse(error: unknown): Response {
  const safe = publicChatError(error);
  return Response.json({ code: safe.code, message: safe.message }, { status: safe.status });
}
