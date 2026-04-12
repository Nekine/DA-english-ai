import { generateTextFromProvider, getHttpStatusFromError, type AiProvider } from "./ai/ai-client";
import { loadPromptTemplate } from "./ai/prompt-loader";

type SearchInput = {
  keyword: string;
  context?: string;
  provider?: string;
};

type SearchHistoryItem = {
  word: string;
  timestamp: string;
};

const MAX_KEYWORD_WORDS = 5;
const MAX_CONTEXT_WORDS = 50;
const MAX_HISTORY_ITEMS = 50;
const MAX_GENERATION_ATTEMPTS = 3;
const VIETNAMESE_DIACRITIC_REGEX = /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i;

const searchHistory: SearchHistoryItem[] = [];
const favoriteWords = new Set<string>();
const searchCache = new Map<string, string>();

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function isEnglishLike(value: string): boolean {
  return /^[a-zA-Z\s'\-]+$/.test(value);
}

function normalizeProvider(provider: string | undefined): AiProvider | null {
  const normalized = (provider ?? "openai").trim().toLowerCase();
  if (normalized === "gemini" || normalized === "openai" || normalized === "xai") {
    return normalized;
  }

  return null;
}

function normalizeForValidation(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function sanitizeDictionaryMarkdown(value: string): string {
  let cleaned = value.trim();
  const fencedMatch = cleaned.match(/^```[a-zA-Z]*\s*([\s\S]*?)\s*```$/);
  if (fencedMatch?.[1]) {
    cleaned = fencedMatch[1].trim();
  }

  return cleaned.replace(/\r\n/g, "\n").trim();
}

function hasExpectedDictionaryStructure(value: string): boolean {
  const normalized = normalizeForValidation(value);
  return ["## 1.", "## 2.", "## 3.", "## 4.", "## 5.", "## 6.", "## 7."].every((section) =>
    normalized.includes(section),
  );
}

function stripAllowedEnglishLines(value: string): string {
  const lines = value.split("\n");
  const kept = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return false;
    }

    if (/^-\s*EN\s*:/i.test(trimmed)) {
      return false;
    }

    if (/^-\s*IPA\s*\(/i.test(trimmed)) {
      return false;
    }

    return true;
  });

  return kept.join("\n");
}

function hasVietnameseWithDiacritics(value: string): boolean {
  return VIETNAMESE_DIACRITIC_REGEX.test(value);
}

function hasTooMuchEnglishOutsideExamples(value: string): boolean {
  const body = stripAllowedEnglishLines(value).toLowerCase();
  if (!body) {
    return false;
  }

  const englishStopwords = body.match(/\b(the|and|or|to|of|in|for|with|is|are|was|were|this|that|from|by|on|as|at|an|a|it|be)\b/g) ?? [];
  return englishStopwords.length >= 6;
}

function getDictionaryOutputIssue(value: string): string | null {
  if (!hasExpectedDictionaryStructure(value)) {
    return "Thiếu cấu trúc bắt buộc ## 1..## 7.";
  }

  const body = stripAllowedEnglishLines(value);
  if (!hasVietnameseWithDiacritics(body)) {
    return "Nội dung giải thích chưa phải tiếng Việt có dấu.";
  }

  if (hasTooMuchEnglishOutsideExamples(value)) {
    return "Giải thích còn quá nhiều tiếng Anh ngoài phần ví dụ EN/VI.";
  }

  return null;
}

function buildDictionaryUserPrompt(input: {
  keyword: string;
  context: string;
  previousIssue?: string;
}): string {
  const parts = [
    `Keyword: ${input.keyword}`,
    `Context: ${input.context || "(none)"}`,
    "Trả về markdown đúng 7 mục theo prompt hệ thống.",
    "Giải thích bắt buộc bằng tiếng Việt có dấu.",
    "Không dùng JSON, không dùng code fence, không chèn link.",
  ];

  if (input.previousIssue && input.previousIssue.trim().length > 0) {
    parts.push(`Previous output issue: ${input.previousIssue}`);
  }

  return parts.join("\n");
}

function pushHistory(word: string): void {
  searchHistory.unshift({
    word,
    timestamp: new Date().toISOString(),
  });

  if (searchHistory.length > MAX_HISTORY_ITEMS) {
    searchHistory.splice(MAX_HISTORY_ITEMS);
  }
}

export async function searchDictionary(input: SearchInput): Promise<{ status: number; error?: string; data?: string }> {
  const keyword = (input.keyword || "").toLowerCase().trim();
  const context = (input.context || "").trim();
  const provider = normalizeProvider(input.provider);

  if (!provider) {
    return { status: 400, error: "Unsupported provider" };
  }

  if (!keyword) {
    return { status: 400, error: "Khong duoc de trong tu khoa" };
  }

  if (countWords(keyword) > MAX_KEYWORD_WORDS) {
    return { status: 400, error: `Noi dung tra cuu chi chua toi da ${MAX_KEYWORD_WORDS} tu` };
  }

  if (!isEnglishLike(keyword)) {
    return { status: 400, error: "Tu khoa can tra cuu phai la tieng Anh" };
  }

  if (context) {
    if (countWords(context) > MAX_CONTEXT_WORDS) {
      return { status: 400, error: `Ngu canh chi chua toi da ${MAX_CONTEXT_WORDS} tu` };
    }

    if (!isEnglishLike(context)) {
      return { status: 400, error: "Ngu canh phai la tieng Anh" };
    }

    if (!context.toLowerCase().includes(keyword)) {
      return { status: 400, error: "Ngu canh phai chua tu khoa can tra" };
    }
  }

  const cacheKey = `search-${keyword}-${context.toLowerCase()}-${provider}`;
  const cached = searchCache.get(cacheKey);
  if (cached) {
    pushHistory(keyword);
    return { status: 200, data: cached };
  }

  const systemPrompt = loadPromptTemplate("dictionary.system.prompt.txt");

  try {
    let previousIssue = "";
    let finalResult = "";

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const userPrompt = buildDictionaryUserPrompt({
        keyword,
        context,
        ...(previousIssue ? { previousIssue } : {}),
      });

      const raw = await generateTextFromProvider({
        provider,
        systemPrompt,
        userPrompt,
        temperature: 0.1,
      });

      const cleaned = sanitizeDictionaryMarkdown(raw);
      finalResult = cleaned;

      const outputIssue = getDictionaryOutputIssue(cleaned);
      if (!outputIssue) {
        break;
      }

      previousIssue = outputIssue;
    }

    searchCache.set(cacheKey, finalResult);
    pushHistory(keyword);
    return { status: 200, data: finalResult };
  } catch (error) {
    return {
      status: getHttpStatusFromError(error, 502),
      error: error instanceof Error ? error.message : "Failed to fetch dictionary result from provider",
    };
  }
}

export function getDictionaryHistory(): SearchHistoryItem[] {
  return [...searchHistory];
}

export function addDictionaryFavorite(word: string): { error?: string; data?: { success: boolean } } {
  const normalized = (word || "").toLowerCase().trim();
  if (!normalized) {
    return { error: "Word is required" };
  }

  favoriteWords.add(normalized);
  return { data: { success: true } };
}

export function getDictionaryFavorites(): string[] {
  return Array.from(favoriteWords).sort();
}

export function removeDictionaryFavorite(word: string): { success: boolean } {
  const normalized = (word || "").toLowerCase().trim();
  if (!normalized) {
    return { success: true };
  }

  favoriteWords.delete(normalized);
  return { success: true };
}
