import { createWritingExercise } from "./writing-exercise-service";
import { appConfig } from "../config";
import { generateTextFromProvider, getHttpStatusFromError, type AiProvider } from "./ai/ai-client";
import { loadPromptTemplate } from "./ai/prompt-loader";

const MIN_WORDS = 15;
const MAX_WORDS = 1200;
const MAX_REVIEW_ATTEMPTS = 3;
const VIETNAMESE_DIACRITICS_PATTERN =
  /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;

const COMMON_ENGLISH_HINT_PATTERN =
  /\b(the|is|are|am|to|of|for|with|and|you|your|this|that|in|on|as|it|be|was|were|have|has|had)\b/gi;

const COMMON_VIETNAMESE_HINT_PATTERN =
  /\b(va|la|cua|trong|voi|ban|nen|khong|de|can|mot|nhung|diem|cau|bai|viet|ngu\s*phap|tu\s*vung)\b/gi;

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

function countMatches(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function toNoDiacritics(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function getReviewOutputIssue(output: string): string | null {
  const trimmed = output.trim();
  if (!trimmed) {
    return "Feedback is empty";
  }

  if (!VIETNAMESE_DIACRITICS_PATTERN.test(trimmed)) {
    return "Feedback must be Vietnamese with diacritics.";
  }

  const lower = trimmed.toLowerCase();
  const lowerNoDiacritics = toNoDiacritics(lower);
  const englishHints = countMatches(lowerNoDiacritics, COMMON_ENGLISH_HINT_PATTERN);
  const vietnameseHints = countMatches(lowerNoDiacritics, COMMON_VIETNAMESE_HINT_PATTERN);
  if (englishHints > vietnameseHints + 8) {
    return "Feedback must be primarily Vietnamese.";
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
    "Important language rule: response must be Vietnamese with full diacritics.",
    "Do not write Vietnamese without diacritics.",
    "Return markdown exactly with the required headings.",
  ].join("\n");

  try {
    let issues: string[] = [];

    for (let attempt = 1; attempt <= MAX_REVIEW_ATTEMPTS; attempt += 1) {
      const promptWithIssues = issues.length > 0
        ? [
            userPrompt,
            "",
            `Previous output issues: ${issues.join("; ")}`,
            "Rewrite full feedback to fix all issues above.",
          ].join("\n")
        : userPrompt;

      const feedback = await generateTextFromProvider({
        provider,
        systemPrompt,
        userPrompt: promptWithIssues,
        temperature: 0.1,
      });

      const issue = getReviewOutputIssue(feedback);
      if (!issue) {
        return { status: 200, text: feedback };
      }

      issues = [issue];
    }

    return {
      status: 502,
      error: "AI feedback is not in valid Vietnamese with diacritics after retries",
    };
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
