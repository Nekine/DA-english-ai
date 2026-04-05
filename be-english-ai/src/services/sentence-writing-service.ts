import { generateJsonFromProvider, getHttpStatusFromError, type AiProvider } from "./ai/ai-client";
import { loadPromptTemplate } from "./ai/prompt-loader";

type GenerateSentenceInput = {
  Topic: string;
  Level: number;
  SentenceCount: number;
  WritingStyle?: string;
  provider?: string;
};

type SentenceItem = {
  Id: number;
  Vietnamese: string;
  CorrectAnswer: string;
  Suggestion: {
    Vocabulary: Array<{ Word: string; Meaning: string }>;
    Structure: string;
  };
};

const COMMON_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "for",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "with",
  "from",
  "up",
  "down",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "this",
  "that",
  "these",
  "those",
  "my",
  "your",
  "his",
  "her",
  "our",
  "their",
  "as",
  "if",
  "then",
  "than",
  "so",
  "very",
]);

function buildFallbackVocabulary(
  correctAnswer: string,
  existingWords: Set<string>,
  needed: number,
): Array<{ Word: string; Meaning: string }> {
  if (needed <= 0) {
    return [];
  }

  const tokens = (correctAnswer.match(/[A-Za-z][A-Za-z'-]*/g) ?? [])
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);

  const fallback: Array<{ Word: string; Meaning: string }> = [];

  for (const token of tokens) {
    const normalized = token.toLowerCase();
    if (COMMON_WORDS.has(normalized) || existingWords.has(normalized)) {
      continue;
    }

    fallback.push({
      Word: token,
      Meaning: "Important word from the sample sentence",
    });
    existingWords.add(normalized);

    if (fallback.length >= needed) {
      break;
    }
  }

  return fallback;
}

function ensureMinimumVocabulary(
  vocabulary: Array<{ Word: string; Meaning: string }>,
  correctAnswer: string,
): Array<{ Word: string; Meaning: string }> {
  const deduped: Array<{ Word: string; Meaning: string }> = [];
  const seen = new Set<string>();

  for (const item of vocabulary) {
    const normalizedWord = item.Word.toLowerCase();
    if (seen.has(normalizedWord)) {
      continue;
    }

    seen.add(normalizedWord);
    deduped.push(item);
  }

  if (deduped.length >= 2) {
    return deduped;
  }

  const missing = 2 - deduped.length;
  const fallback = buildFallbackVocabulary(correctAnswer, seen, missing);

  return [...deduped, ...fallback];
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
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

export async function generateSentenceWriting(
  input: GenerateSentenceInput,
): Promise<{ status: number; error?: string; data?: { Sentences: SentenceItem[] } }> {
  const topic = (input.Topic || "").trim();
  const sentenceCount = Number(input.SentenceCount);

  if (!topic) {
    return { status: 400, error: "Chu de khong duoc de trong." };
  }

  if (countWords(topic) > 12) {
    return { status: 400, error: "Chu de khong duoc chua nhieu hon 12 tu." };
  }

  if (!Number.isInteger(sentenceCount) || sentenceCount < 5 || sentenceCount > 20) {
    return { status: 400, error: "So luong cau phai nam trong khoang 5 den 20." };
  }

  const provider = normalizeProvider(input.provider);
  if (!provider) {
    return { status: 400, error: "Unsupported provider" };
  }

  const style = (input.WritingStyle || "Communicative").trim();
  const level = levelLabel(Number(input.Level) || 3);

  const systemPrompt = loadPromptTemplate("sentence-writing.system.prompt.txt");
  const userPrompt = [
    `Topic: ${topic}`,
    `CEFR level: ${level}`,
    `SentenceCount: ${sentenceCount}`,
    `WritingStyle: ${style}`,
    "Return ONLY JSON object with key Sentences.",
    "Each sentence item must include: Id, Vietnamese, CorrectAnswer, Suggestion.Vocabulary, Suggestion.Structure.",
  ].join("\n");

  try {
    const parsed = await generateJsonFromProvider<{ Sentences?: SentenceItem[] }>({
      provider,
      systemPrompt,
      userPrompt,
      temperature: 0.5,
    });

    const rawSentences = Array.isArray(parsed?.Sentences) ? parsed.Sentences : [];
    const sentences = rawSentences.slice(0, sentenceCount).map((item, index) => {
      const vocabulary = Array.isArray(item?.Suggestion?.Vocabulary)
        ? item.Suggestion.Vocabulary
            .map((v) => ({
              Word: String(v?.Word ?? "").trim(),
              Meaning: String(v?.Meaning ?? "").trim(),
            }))
            .filter((v) => v.Word && v.Meaning)
        : [];

      const correctAnswer = String(item?.CorrectAnswer ?? "").trim();

      return {
        Id: Number(item?.Id ?? index + 1),
        Vietnamese: String(item?.Vietnamese ?? "").trim(),
        CorrectAnswer: correctAnswer,
        Suggestion: {
          Vocabulary: ensureMinimumVocabulary(vocabulary, correctAnswer),
          Structure: String(item?.Suggestion?.Structure ?? "").trim(),
        },
      };
    });

    if (sentences.length === 0) {
      return { status: 502, error: "AI returned empty sentences" };
    }

    for (const sentence of sentences) {
      if (
        !sentence.Vietnamese ||
        !sentence.CorrectAnswer ||
        !sentence.Suggestion.Structure ||
        sentence.Suggestion.Vocabulary.length < 2
      ) {
        return { status: 502, error: "AI returned invalid sentence format" };
      }
    }

    return {
      status: 201,
      data: {
        Sentences: sentences,
      },
    };
  } catch (error) {
    return {
      status: getHttpStatusFromError(error, 502),
      error: error instanceof Error ? error.message : "Failed to generate sentence writing from provider",
    };
  }
}
