import { createWritingExercise } from "./writing-exercise-service";
import { appConfig } from "../config";
import { generateTextFromProvider, getHttpStatusFromError, type AiProvider } from "./ai/ai-client";
import { loadPromptTemplate } from "./ai/prompt-loader";

const MIN_WORDS = 15;
const MAX_WORDS = 1200;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeLevel(level: number): string {
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

function estimateScore(wordCount: number, hasParagraphs: boolean): number {
  let score = 60;
  if (wordCount >= 80) score += 10;
  if (wordCount >= 140) score += 8;
  if (wordCount >= 220) score += 6;
  if (hasParagraphs) score += 6;
  return Math.min(95, score);
}

function normalizeProvider(provider: string | undefined): AiProvider | null {
  const normalized = (provider ?? "openai").trim().toLowerCase();
  if (normalized === "gemini" || normalized === "openai" || normalized === "xai") {
    return normalized;
  }

  return null;
}

export async function generateReviewText(input: {
  userLevel: number;
  requirement: string;
  content: string;
  provider?: string;
}): Promise<{ status: number; error?: string; text?: string }> {
  const requirement = (input.requirement || "").trim();
  const content = (input.content || "").trim();

  if (!content) {
    return { status: 400, error: "Noi dung bai viet khong duoc de trong" };
  }

  const words = countWords(content);
  if (words < MIN_WORDS) {
    return { status: 400, error: `Bai viet phai dai toi thieu ${MIN_WORDS} tu.` };
  }

  if (words > MAX_WORDS) {
    return { status: 400, error: `Bai viet khong duoc dai hon ${MAX_WORDS} tu.` };
  }

  const provider = normalizeProvider(input.provider);
  if (!provider) {
    return { status: 400, error: "Unsupported provider" };
  }

  const level = normalizeLevel(Number(input.userLevel) || 3);
  const hasParagraphs = content.includes("\n");
  const score = estimateScore(words, hasParagraphs);
  const systemPrompt = loadPromptTemplate("review.system.prompt.txt");
  const userPrompt = [
    `Target level: ${level}`,
    `Estimated baseline score hint: ${score}`,
    `Requirement: ${requirement || "(none)"}`,
    "Student writing:",
    content,
    "",
    "Return markdown exactly with the required headings.",
  ].join("\n");

  try {
    const feedback = await generateTextFromProvider({
      provider,
      systemPrompt,
      userPrompt,
      temperature: 0.4,
    });

    return { status: 200, text: feedback };
  } catch (error) {
    return {
      status: getHttpStatusFromError(error, 502),
      error: error instanceof Error ? error.message : "Failed to generate writing review from provider",
    };
  }
}

export async function saveReviewWritingExercise(input: {
  title: string;
  content?: string;
  requirement: string;
  level?: string;
  category?: string;
  estimatedMinutes: number;
  timeLimit: number;
  description?: string;
  createdBy: number;
}) {
  if (!appConfig.db.enabled) {
    return {
      success: true,
      exerciseId: Date.now(),
      message: "Da tao bai viet thanh cong (no-db mode)",
    };
  }

  const questionsJson = JSON.stringify({ requirement: input.requirement });
  const correctAnswersJson = JSON.stringify({ userAnswer: input.content ?? "" });

  const exerciseId = await createWritingExercise({
    title: input.title,
    content: "",
    questionsJson,
    correctAnswersJson,
    level: input.level ?? "Intermediate",
    type: "writing_essay",
    category: input.category ?? "General",
    estimatedMinutes: input.estimatedMinutes,
    timeLimit: input.timeLimit,
    description: input.description ?? "",
    createdBy: input.createdBy,
  });

  return {
    success: true,
    exerciseId,
    message: "Da luu bai tap thanh cong!",
  };
}
