type ChatMessage = {
  FromUser: boolean;
  Message: string;
};

type Conversation = {
  ChatHistory?: ChatMessage[];
  Question?: string;
  ImagesAsBase64?: string[] | null;
};

export type ChatbotInput = {
  request: Conversation;
  username: string;
  gender: string;
  age: number;
  englishLevel: number;
  enableReasoning?: boolean;
  enableSearching?: boolean;
  provider?: string;
};

import { generateTextFromProvider, getHttpStatusFromError, type AiProvider } from "./ai/ai-client";
import { loadPromptTemplate, renderPrompt } from "./ai/prompt-loader";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function levelLabel(level: number): string {
  const map: Record<number, string> = {
    1: "A1",
    2: "A2",
    3: "B1",
    4: "B2",
    5: "C1",
    6: "C2",
  };
  return map[level] ?? "B1";
}

function normalizeProvider(provider: string | undefined): AiProvider | null {
  const normalized = (provider ?? "openai").trim().toLowerCase();
  if (normalized === "gemini" || normalized === "openai" || normalized === "xai") {
    return normalized;
  }

  return null;
}

export async function generateChatbotAnswer(input: ChatbotInput): Promise<{ status: number; error?: string; text?: string }> {
  const question = (input.request.Question || "").trim();
  const provider = normalizeProvider(input.provider);

  if (!provider) {
    return { status: 400, error: "Unsupported provider" };
  }

  if (!question) {
    return { status: 400, error: "Question is required" };
  }

  if (countWords(question) > 30) {
    return { status: 400, error: "Question must be 30 words or fewer" };
  }

  const username = input.username.trim() || "ban";
  const level = levelLabel(Number(input.englishLevel) || 3);
  const history = input.request.ChatHistory ?? [];

  const systemTemplate = loadPromptTemplate("chatbot.system.prompt.txt");
  const systemPrompt = renderPrompt(systemTemplate, {
    username,
    gender: input.gender || "unknown",
    age: input.age,
    cefrLevel: level,
  });

  const chatHistoryText = history
    .slice(-20)
    .map((msg) => `${msg.FromUser ? "User" : "Assistant"}: ${msg.Message.trim()}`)
    .join("\n");

  const userPrompt = [
    `Provider selected by user: ${provider}`,
    `Reasoning enabled: ${input.enableReasoning ? "true" : "false"}`,
    `Searching enabled: ${input.enableSearching ? "true" : "false"}`,
    "",
    "Conversation history:",
    chatHistoryText || "(empty)",
    "",
    "Current question:",
    question,
    "",
    "Return final answer in Vietnamese markdown.",
  ].join("\n");

  try {
    const text = await generateTextFromProvider({
      provider,
      systemPrompt,
      userPrompt,
      temperature: 0.4,
    });

    return { status: 200, text };
  } catch (error) {
    return {
      status: getHttpStatusFromError(error, 502),
      error: error instanceof Error ? error.message : "Failed to get response from AI provider",
    };
  }
}
