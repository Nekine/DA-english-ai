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

const ENGLISH_FUNCTION_WORDS = new Set([
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "am",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "can",
  "could",
  "should",
  "must",
  "may",
  "might",
  "to",
  "for",
  "with",
  "in",
  "on",
  "at",
  "from",
  "by",
  "of",
  "that",
  "this",
  "these",
  "those",
  "if",
  "when",
  "while",
  "because",
  "and",
  "or",
  "but",
]);

const VOCAB_MEANING_LEXICON: Record<string, string> = {
  universe: "vũ trụ",
  vast: "rộng lớn",
  scientist: "nhà khoa học",
  scientists: "các nhà khoa học",
  telescope: "kính thiên văn",
  telescopes: "các kính thiên văn",
  observe: "quan sát",
  distant: "xa xôi",
  star: "ngôi sao",
  stars: "các vì sao",
  planet: "hành tinh",
  planets: "các hành tinh",
  provide: "cung cấp",
  provides: "cung cấp",
  light: "ánh sáng",
  heat: "nhiệt",
  earth: "trái đất",
  many: "nhiều",
  people: "mọi người",
  believe: "tin rằng",
  life: "sự sống",
  exist: "tồn tại",
  other: "khác",
  studying: "việc nghiên cứu",
  study: "nghiên cứu",
  origin: "nguồn gốc",
  world: "thế giới",
  sentence: "câu",
  translate: "dịch",
  practice: "luyện tập",
  topic: "chủ đề",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  return "";
}

function readNumber(record: Record<string, unknown>, keys: string[], fallback: number): number {
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value)) {
      return Math.trunc(value);
    }
  }

  return fallback;
}

function readArray(record: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function hasVietnameseDiacritics(value: string): boolean {
  return /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(value);
}

function foldVietnamese(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isPlaceholderMeaning(value: string): boolean {
  const folded = foldVietnamese(value);
  return /nghia\s*tieng\s*viet\s*cua/.test(folded);
}

function tokenizeEnglishLikeWords(value: string): string[] {
  return (value.match(/[A-Za-z][A-Za-z'-]*/g) ?? []).map((token) => token.toLowerCase());
}

function toEnglishWord(value: string): string {
  const token = (value.match(/[A-Za-z][A-Za-z'-]*/g) ?? [])[0];
  return token ? token.trim() : "";
}

function isLikelyEnglishSentence(value: string): boolean {
  const text = value.trim();
  if (!text) {
    return false;
  }

  if (hasVietnameseDiacritics(text)) {
    return false;
  }

  const words = tokenizeEnglishLikeWords(text);
  if (words.length < 3) {
    return false;
  }

  const functionWordHits = words.reduce(
    (sum, word) => sum + (ENGLISH_FUNCTION_WORDS.has(word) ? 1 : 0),
    0,
  );

  return functionWordHits >= 1;
}

function isLikelyEnglishStructure(value: string): boolean {
  const text = value.trim();
  if (!text) {
    return false;
  }

  if (hasVietnameseDiacritics(text)) {
    return false;
  }

  if (!/[A-Za-z]/.test(text)) {
    return false;
  }

  return /\b(S|V|N|If|Do|Does|Did|Should|Would|Can|Could|Present|Past|Future)\b/i.test(text) || /\+/.test(text);
}

function normalizeVietnameseMeaning(rawMeaning: string, word: string): string {
  const meaning = rawMeaning.trim();
  if (meaning.length > 0 && hasVietnameseDiacritics(meaning) && !isPlaceholderMeaning(meaning)) {
    return meaning;
  }

  const normalizedWord = word.toLowerCase();
  return VOCAB_MEANING_LEXICON[normalizedWord] ?? "";
}

function normalizeWordForLookup(word: string): string {
  const cleaned = toEnglishWord(word).toLowerCase();
  if (!cleaned) {
    return "";
  }

  if (VOCAB_MEANING_LEXICON[cleaned]) {
    return cleaned;
  }

  if (cleaned.endsWith("ies") && cleaned.length > 3) {
    const singular = `${cleaned.slice(0, -3)}y`;
    if (VOCAB_MEANING_LEXICON[singular]) {
      return singular;
    }
  }

  if (cleaned.endsWith("ing") && cleaned.length > 5) {
    const stem = cleaned.slice(0, -3);
    if (VOCAB_MEANING_LEXICON[stem]) {
      return stem;
    }
    const withE = `${stem}e`;
    if (VOCAB_MEANING_LEXICON[withE]) {
      return withE;
    }
  }

  if (cleaned.endsWith("es") && cleaned.length > 4) {
    const stem = cleaned.slice(0, -2);
    if (VOCAB_MEANING_LEXICON[stem]) {
      return stem;
    }
  }

  if (cleaned.endsWith("s") && cleaned.length > 3) {
    const singular = cleaned.slice(0, -1);
    if (VOCAB_MEANING_LEXICON[singular]) {
      return singular;
    }
  }

  return cleaned;
}

function shouldResolveMeaning(word: string, meaning: string): boolean {
  const englishWord = toEnglishWord(word);
  if (!englishWord) {
    return false;
  }

  const trimmed = meaning.trim();
  if (!trimmed) {
    return true;
  }

  if (isPlaceholderMeaning(trimmed)) {
    return true;
  }

  if (/useful word|important word/i.test(trimmed)) {
    return true;
  }

  return !hasVietnameseDiacritics(trimmed);
}

type MeaningPair = { word: string; meaning: string };

function extractMeaningPairs(payload: unknown): MeaningPair[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => item !== null)
      .map((item) => ({
        word: readString(item, ["word", "Word", "term", "Term"]),
        meaning: readString(item, ["meaning", "Meaning", "vietnamese", "Vietnamese"]),
      }))
      .filter((item) => item.word.length > 0 && item.meaning.length > 0);
  }

  const record = asRecord(payload);
  if (!record) {
    return [];
  }

  const list = readArray(record, ["items", "Items", "data", "Data", "words", "Words"]);
  if (list.length > 0) {
    return extractMeaningPairs(list);
  }

  const mapped = readArray(record, ["mappings", "Mappings", "translations", "Translations"]);
  if (mapped.length > 0) {
    return extractMeaningPairs(mapped);
  }

  return [];
}

async function translateWordsToVietnameseByAi(input: {
  provider: AiProvider;
  words: string[];
}): Promise<Map<string, string>> {
  if (input.words.length === 0) {
    return new Map<string, string>();
  }

  try {
    const userPrompt = [
      "Translate each English word to a concise Vietnamese meaning with diacritics.",
      "Return ONLY JSON object with key Items.",
      "Each item: { \"Word\": \"...\", \"Meaning\": \"...\" }",
      `Words: ${JSON.stringify(input.words)}`,
    ].join("\n");

    const parsed = await generateJsonFromProvider<unknown>({
      provider: input.provider,
      systemPrompt:
        "You are a bilingual EN-VI lexicon assistant. Provide accurate Vietnamese meanings with proper diacritics.",
      userPrompt,
      temperature: 0,
    });

    const pairs = extractMeaningPairs(parsed);
    const result = new Map<string, string>();

    for (const pair of pairs) {
      const key = normalizeWordForLookup(pair.word);
      if (!key) {
        continue;
      }

      const meaning = pair.meaning.trim();
      if (!meaning || isPlaceholderMeaning(meaning) || !hasVietnameseDiacritics(meaning)) {
        continue;
      }

      result.set(key, meaning);
    }

    return result;
  } catch {
    return new Map<string, string>();
  }
}

async function enrichVocabularyMeanings(input: {
  sentences: SentenceItem[];
  provider: AiProvider;
}): Promise<SentenceItem[]> {
  const unresolved = new Set<string>();

  for (const sentence of input.sentences) {
    for (const item of sentence.Suggestion.Vocabulary) {
      if (!shouldResolveMeaning(item.Word, item.Meaning)) {
        continue;
      }

      const key = normalizeWordForLookup(item.Word);
      if (key) {
        unresolved.add(key);
      }
    }
  }

  if (unresolved.size === 0) {
    return input.sentences;
  }

  const fromLexicon = new Map<string, string>();
  const stillMissing: string[] = [];

  for (const word of unresolved) {
    const meaning = VOCAB_MEANING_LEXICON[word];
    if (meaning && hasVietnameseDiacritics(meaning)) {
      fromLexicon.set(word, meaning);
    } else {
      stillMissing.push(word);
    }
  }

  const fromAi = await translateWordsToVietnameseByAi({
    provider: input.provider,
    words: stillMissing,
  });

  return input.sentences.map((sentence) => ({
    ...sentence,
    Suggestion: {
      ...sentence.Suggestion,
      Vocabulary: sentence.Suggestion.Vocabulary.map((item) => {
        const key = normalizeWordForLookup(item.Word);
        if (!key) {
          return item;
        }

        if (!shouldResolveMeaning(item.Word, item.Meaning)) {
          return item;
        }

        const resolved = fromLexicon.get(key) ?? fromAi.get(key);
        if (resolved && hasVietnameseDiacritics(resolved)) {
          return {
            Word: toEnglishWord(item.Word) || item.Word,
            Meaning: resolved,
          };
        }

        return {
          Word: toEnglishWord(item.Word) || item.Word,
          Meaning: item.Meaning.trim() || "từ tiếng Anh",
        };
      }),
    },
  }));
}

function inferStructureHint(correctAnswer: string): string {
  const normalized = correctAnswer.toLowerCase();

  if (/\bif\b/.test(normalized) && /\bwill\b/.test(normalized)) {
    return "If + S + V(present), S + will + V...";
  }

  if (/\bshould\b/.test(normalized)) {
    return "S + should + V...";
  }

  if (/\b(has|have)\b/.test(normalized) && /\b(ed|en)\b/.test(normalized)) {
    return "S + has/have + V3/ed...";
  }

  if (/^(do|does|did)\b/.test(normalized) || /\?$/.test(correctAnswer.trim())) {
    return "Do/Does/Did + S + V...?";
  }

  return "S + V + ...";
}

function normalizeVocabularyItems(
  rawVocabulary: unknown[],
  correctAnswer: string,
): Array<{ Word: string; Meaning: string }> {
  const items = rawVocabulary
    .map((item) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (!trimmed) {
          return null;
        }

        const word = toEnglishWord(trimmed);
        if (!word) {
          return null;
        }

        return {
          Word: word,
          Meaning: normalizeVietnameseMeaning("", word),
        };
      }

      const record = asRecord(item);
      if (!record) {
        return null;
      }

      const rawWord = readString(record, ["Word", "word", "Vocabulary", "vocabulary", "term", "Term"]);
      const word = toEnglishWord(rawWord);
      const meaning = readString(record, ["Meaning", "meaning", "Vietnamese", "vietnamese", "definition", "Definition"]);

      if (!word) {
        return null;
      }

      return {
        Word: word,
        Meaning: normalizeVietnameseMeaning(meaning, word),
      };
    })
    .filter((item): item is { Word: string; Meaning: string } => item !== null);

  return ensureMinimumVocabulary(items, correctAnswer);
}

function extractSentenceCandidates(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  const direct = readArray(root, ["Sentences", "sentences", "Items", "items"]);
  if (direct.length > 0) {
    return direct;
  }

  const nestedData = root.data;
  if (Array.isArray(nestedData)) {
    return nestedData;
  }

  const nestedRecord = asRecord(nestedData);
  if (!nestedRecord) {
    return [];
  }

  return readArray(nestedRecord, ["Sentences", "sentences", "Items", "items"]);
}

function normalizeSentenceItem(raw: unknown, index: number): SentenceItem | null {
  const item = asRecord(raw);
  if (!item) {
    return null;
  }

  const vietnamese = readString(item, [
    "Vietnamese",
    "vietnamese",
    "Prompt",
    "prompt",
    "Question",
    "question",
    "VietnameseSentence",
  ]);

  const correctAnswer = readString(item, [
    "CorrectAnswer",
    "correctAnswer",
    "English",
    "english",
    "Answer",
    "answer",
    "Translation",
    "translation",
  ]);

  if (!vietnamese || !correctAnswer) {
    return null;
  }

  const suggestion = asRecord(item.Suggestion) ?? asRecord(item.suggestion) ?? item;
  const rawVocabulary = suggestion
    ? readArray(suggestion, ["Vocabulary", "vocabulary", "Words", "words"])
    : [];
  const vocabulary = normalizeVocabularyItems(rawVocabulary, correctAnswer);
  const structure = suggestion
    ? readString(suggestion, ["Structure", "structure", "Pattern", "pattern"]) || inferStructureHint(correctAnswer)
    : inferStructureHint(correctAnswer);

  return {
    Id: readNumber(item, ["Id", "id", "No", "no"], index + 1),
    Vietnamese: vietnamese,
    CorrectAnswer: correctAnswer,
    Suggestion: {
      Vocabulary: vocabulary,
      Structure: structure,
    },
  };
}

function buildFallbackSentence(topic: string, id: number): SentenceItem {
  const cleanTopic = topic.trim() || "daily life";

  return {
    Id: id,
    Vietnamese: `Tôi đang luyện viết về chủ đề ${cleanTopic} (câu ${id}).`,
    CorrectAnswer: `I am practicing writing about ${cleanTopic} (sentence ${id}).`,
    Suggestion: {
      Vocabulary: [
        { Word: "practice", Meaning: "luyện tập" },
        { Word: "topic", Meaning: "chủ đề" },
      ],
      Structure: "S + am/is/are + V-ing...",
    },
  };
}

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
      Meaning: normalizeVietnameseMeaning("", token),
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
  const combined = [...deduped, ...fallback];

  if (combined.length >= 2) {
    return combined;
  }

  const genericFallback = [
    { Word: "sentence", Meaning: "câu" },
    { Word: "translate", Meaning: "dịch" },
  ];

  for (const item of genericFallback) {
    const normalized = item.Word.toLowerCase();
    if (!seen.has(normalized)) {
      combined.push(item);
      seen.add(normalized);
    }
    if (combined.length >= 2) {
      break;
    }
  }

  return combined;
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

function buildFallbackEnglishAnswer(topic: string, id: number): string {
  const cleanTopic = topic.trim() || "daily life";
  return `I am practicing ${cleanTopic} sentence writing (sentence ${id}).`;
}

function needsRepair(sentence: SentenceItem): boolean {
  if (!isLikelyEnglishSentence(sentence.CorrectAnswer)) {
    return true;
  }

  if (!isLikelyEnglishStructure(sentence.Suggestion.Structure)) {
    return true;
  }

  if (sentence.Suggestion.Vocabulary.length < 2) {
    return true;
  }

  for (const item of sentence.Suggestion.Vocabulary) {
    if (!toEnglishWord(item.Word)) {
      return true;
    }

    if (!hasVietnameseDiacritics(item.Meaning) || isPlaceholderMeaning(item.Meaning)) {
      return true;
    }
  }

  return false;
}

async function repairInvalidSentences(input: {
  provider: AiProvider;
  topic: string;
  level: string;
  writingStyle: string;
  invalidSentences: SentenceItem[];
}): Promise<Map<number, SentenceItem>> {
  if (input.invalidSentences.length === 0) {
    return new Map<number, SentenceItem>();
  }

  const userPrompt = [
    `Topic: ${input.topic}`,
    `CEFR level: ${input.level}`,
    `WritingStyle: ${input.writingStyle}`,
    "Fix the following Vietnamese-to-English sentence items.",
    "Keep Vietnamese exactly as provided.",
    "CorrectAnswer must be natural English only.",
    "Suggestion.Structure must be English grammar pattern only.",
    "Suggestion.Vocabulary must contain at least 2 items.",
    "Vocabulary.Word must be English word only.",
    "Vocabulary.Meaning must be Vietnamese meaning with diacritics.",
    "Return ONLY JSON object with key Sentences.",
    `Input: ${JSON.stringify(input.invalidSentences)}`,
  ].join("\n");

  const parsed = await generateJsonFromProvider<unknown>({
    provider: input.provider,
    systemPrompt:
      "You are a Vietnamese-English teacher. Repair JSON sentence items to strict format and quality.",
    userPrompt,
    temperature: 0.2,
  });

  const repaired = extractSentenceCandidates(parsed)
    .map((item, index) => normalizeSentenceItem(item, index))
    .filter((item): item is SentenceItem => item !== null);

  return new Map<number, SentenceItem>(repaired.map((item) => [item.Id, item]));
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
    "CorrectAnswer MUST be English translation only (not Vietnamese).",
    "Suggestion.Structure MUST be English grammar pattern only.",
    "Suggestion.Vocabulary.Word MUST be English word.",
    "Suggestion.Vocabulary.Meaning MUST be Vietnamese meaning with diacritics.",
  ].join("\n");

  try {
    const parsed = await generateJsonFromProvider<unknown>({
      provider,
      systemPrompt,
      userPrompt,
      temperature: 0.5,
    });

    const rawSentences = extractSentenceCandidates(parsed);
    let sentences = rawSentences
      .map((item, index) => normalizeSentenceItem(item, index))
      .filter((item): item is SentenceItem => item !== null)
      .slice(0, sentenceCount)
      .map((item, index) => ({
        ...item,
        Id: index + 1,
      }));

    if (sentences.length === 0) {
      sentences = Array.from({ length: sentenceCount }, (_, index) =>
        buildFallbackSentence(topic, index + 1),
      );
    }

    if (sentences.length < sentenceCount) {
      for (let i = sentences.length; i < sentenceCount; i += 1) {
        sentences.push(buildFallbackSentence(topic, i + 1));
      }
    }

    const invalidSentences = sentences.filter((sentence) => needsRepair(sentence));
    if (invalidSentences.length > 0) {
      try {
        const repairedMap = await repairInvalidSentences({
          provider,
          topic,
          level,
          writingStyle: style,
          invalidSentences,
        });

        sentences = sentences.map((sentence) => repairedMap.get(sentence.Id) ?? sentence);
      } catch {
        // Keep original sentences and continue with deterministic sanitization.
      }
    }

    sentences = sentences.map((sentence, index) => {
      const fallback = buildFallbackSentence(topic, index + 1);
      const vietnamese = sentence.Vietnamese?.trim() || fallback.Vietnamese;
      const rawCorrectAnswer = sentence.CorrectAnswer?.trim() || fallback.CorrectAnswer;
      const correctAnswer = isLikelyEnglishSentence(rawCorrectAnswer)
        ? rawCorrectAnswer
        : buildFallbackEnglishAnswer(topic, index + 1);

      const rawStructure = sentence.Suggestion?.Structure?.trim() || "";
      const structure = isLikelyEnglishStructure(rawStructure)
        ? rawStructure
        : inferStructureHint(correctAnswer);

      const vocabulary = ensureMinimumVocabulary(
        Array.isArray(sentence.Suggestion?.Vocabulary) ? sentence.Suggestion.Vocabulary : [],
        correctAnswer,
      );

      return {
        Id: index + 1,
        Vietnamese: vietnamese,
        CorrectAnswer: correctAnswer,
        Suggestion: {
          Vocabulary: vocabulary,
          Structure: structure,
        },
      };
    });

    sentences = await enrichVocabularyMeanings({
      sentences,
      provider,
    });

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
