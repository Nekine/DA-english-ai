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
  const userPrompt = [
    `Keyword: ${keyword}`,
    `Context: ${context || "(none)"}`,
    `Provider selected by user: ${provider}`,
    "Return markdown with exact required structure.",
  ].join("\n");

  try {
    const result = await generateTextFromProvider({
      provider,
      systemPrompt,
      userPrompt,
      temperature: 0.2,
    });

    searchCache.set(cacheKey, result);
    pushHistory(keyword);
    return { status: 200, data: result };
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
