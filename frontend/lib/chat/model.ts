import { createMistral } from "@ai-sdk/mistral";
import type { LanguageModel } from "ai";
import { ChatError } from "./errors";

export interface ChatModelConfig {
  provider: "mistral";
  model: string;
}

export function resolveChatModelConfig(): ChatModelConfig {
  const configured = process.env.CHAT_MODEL?.trim() || `mistral:${process.env.MISTRAL_MODEL?.trim() || "mistral-large-latest"}`;
  const [provider, ...modelParts] = configured.split(":");
  const model = modelParts.join(":").trim();
  if (provider !== "mistral" || !model) throw new ChatError("chat_unavailable", "The configured chat provider is not supported.", 500);
  if (!process.env.MISTRAL_API_KEY?.trim()) throw new ChatError("chat_unavailable", "The chat provider is not configured.", 500);
  return { provider, model };
}

export function resolveChatModel(): LanguageModel {
  const config = resolveChatModelConfig();
  return createMistral({ apiKey: process.env.MISTRAL_API_KEY })(config.model);
}
