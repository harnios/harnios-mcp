import { Mistral } from "@mistralai/mistralai";
import type { ChatCompletionRequest, ChatCompletionResponse } from "@mistralai/mistralai/models/components";
import { SchedulerError } from "./errors";

/**
 * Thin wrapper over @mistralai/mistralai's chat-completion call. Kept
 * separate from runSchedule.ts's loop logic so the SDK boundary — and any
 * future need to adjust it for a new SDK version — is isolated to one file
 * (research.md §2).
 */
export async function completeChat(apiKey: string, request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const client = new Mistral({ apiKey });
  try {
    return await client.chat.complete(request);
  } catch (err) {
    throw new SchedulerError("llm_unreachable", `Mistral API call failed: ${(err as Error).message}`);
  }
}
