import { generateJsonFromProvider, getHttpStatusFromError, type AiProvider } from "./ai/ai-client";
import { loadPromptTemplate } from "./ai/prompt-loader";

type GenerateAssignmentInput = {
  Topic: string;
  AssignmentTypes: number[];
  EnglishLevel: number;
  TotalQuestions: number;
  provider?: string;
};

type QuizQuestion = {
  Question: string;
  Options: string[];
  RightOptionIndex: number;
  ExplanationInVietnamese: string;
};

type UnknownRecord = Record<string, unknown>;

const ENGLISH_LEVELS: Record<number, string> = {
  1: "Beginner: Understands clear and basic personal information and very short simple content",
  2: "Elementary: Understands short texts on familiar daily topics and basic information from short emails",
  3: "Intermediate: Understands simple news/biography texts and can find specific information in short articles",
  4: "Upper Intermediate: Understands fairly complex texts including literary and technical information",
  5: "Advanced: Understands complex materials and can analyze nuanced arguments",
  6: "Proficient: Understands academic and abstract texts with deep multi-angle comprehension",
};

const ASSIGNMENT_TYPES: Record<number, string> = {
  1: "Most Suitable Word: Choose the most suitable word",
  2: "Verb Conjugation: Conjugate verbs",
  3: "Conditional Sentences: Choose the correct conditional form",
  4: "Indirect Speech: Convert direct to indirect speech",
  5: "Sentence Completion: Fill in the blank",
  6: "Reading Comprehension: Answer based on context",
  7: "Grammar: Choose the grammatically correct option",
  8: "Collocation: Choose natural word combinations",
  9: "Synonym/Antonym: Find closest meaning",
  10: "Vocabulary: Select the most accurate vocabulary",
  11: "Error Identification: Identify incorrect usage",
  12: "Word Formation: Build correct word forms",
  13: "Passive Voice: Transform active/passive structures",
  14: "Relative Clauses: Complete with suitable relative clauses",
  15: "Comparison Sentences: Build correct comparison patterns",
  16: "Inversion: Choose correct inverted structures",
  17: "Articles: Use a/an/the correctly",
  18: "Prepositions: Choose the correct preposition",
  19: "Idioms: Select the correct idiomatic meaning",
  20: "Sentence Transformation: Keep meaning after rewrite",
  21: "Pronunciation & Stress: Choose correct stress/pronunciation pattern",
  22: "Cloze Test: Fill a short passage",
  23: "Sentence Combination: Combine clauses accurately",
  24: "Matching Headings: Match heading to paragraph",
  25: "Dialogue Completion: Complete conversational turns",
  26: "Sentence Ordering: Arrange sentence parts in order",
  27: "Word Meaning in Context: Infer meaning by context",
};

const LEVEL_TOPICS: Record<number, string[]> = {
  1: ["My family", "Daily routine", "Favorite food", "School life", "Hobbies"],
  2: ["Travel plans", "Healthy habits", "Shopping", "Weekend activities", "Work tasks"],
  3: ["Technology in life", "Learning online", "Career goals", "Environment", "Culture"],
  4: ["Remote work", "Media influence", "Public transport", "City planning", "Education reform"],
  5: ["Leadership", "Innovation", "Ethics", "Globalization", "Mental health"],
  6: ["Academic research", "Policy debate", "Societal change", "Critical thinking", "Digital transformation"],
};

const DEFAULT_TOPIC_LIST = LEVEL_TOPICS[3] ?? ["Technology in life", "Learning online", "Career goals", "Environment", "Culture"];

function ensureValidInput(input: GenerateAssignmentInput): string | null {
  const topic = input.Topic?.trim();
  const totalQuestions = Number(input.TotalQuestions);
  const assignmentTypes = Array.isArray(input.AssignmentTypes) ? input.AssignmentTypes : [];

  if (!topic) {
    return "Ten chu de khong duoc de trong";
  }

  if (topic.split(/\s+/).filter(Boolean).length > 15) {
    return "Chu de khong duoc chua nhieu hon 15 tu";
  }

  if (!Number.isInteger(totalQuestions) || totalQuestions < 1 || totalQuestions > 50) {
    return "So luong cau hoi phai nam trong khoang 1 den 50";
  }

  if (assignmentTypes.length === 0) {
    return "Can chon it nhat mot dang cau hoi";
  }

  if (totalQuestions < assignmentTypes.length) {
    return "So luong cau hoi khong duoc nho hon so dang cau hoi da chon";
  }

  return null;
}

function normalizeProvider(provider: string | undefined): AiProvider | null {
  const normalized = (provider ?? "openai").trim().toLowerCase();
  if (normalized === "gemini" || normalized === "openai" || normalized === "xai") {
    return normalized;
  }

  return null;
}

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as UnknownRecord;
}

function readStringFromKeys(record: UnknownRecord | null, keys: string[]): string {
  if (!record) {
    return "";
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function readArrayFromKeys(record: UnknownRecord | null, keys: string[]): unknown[] {
  if (!record) {
    return [];
  }

  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function readObjectFromKeys(record: UnknownRecord | null, keys: string[]): UnknownRecord | null {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = asRecord(record[key]);
    if (value) {
      return value;
    }
  }

  return null;
}

function optionsFromObject(optionObject: UnknownRecord): string[] {
  const orderedKeys = [
    "A", "B", "C", "D",
    "a", "b", "c", "d",
    "1", "2", "3", "4",
    "OptionA", "OptionB", "OptionC", "OptionD",
    "optionA", "optionB", "optionC", "optionD",
  ];

  const options: string[] = [];
  for (const key of orderedKeys) {
    const value = optionObject[key];
    if (typeof value === "string" && value.trim().length > 0) {
      options.push(value.trim());
    }
    if (options.length >= 4) {
      break;
    }
  }

  if (options.length < 4) {
    for (const value of Object.values(optionObject)) {
      if (typeof value === "string" && value.trim().length > 0) {
        options.push(value.trim());
      }
      if (options.length >= 4) {
        break;
      }
    }
  }

  return options;
}

function normalizeOptions(rawOptions: unknown[]): string[] {
  const options = rawOptions
    .map((option) => String(option ?? "").trim())
    .filter((option) => option.length > 0)
    .slice(0, 4);

  while (options.length < 4) {
    options.push(`Option ${String.fromCharCode(65 + options.length)}`);
  }

  return options;
}

function normalizeRightOptionIndex(rawValue: unknown, options: string[]): number {
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    const numeric = Math.trunc(rawValue);
    if (numeric >= 0 && numeric <= 3) {
      return numeric;
    }
    if (numeric >= 1 && numeric <= 4) {
      return numeric - 1;
    }
  }

  if (typeof rawValue === "string") {
    const token = rawValue.trim();
    if (/^\d+$/.test(token)) {
      const numeric = Number(token);
      if (numeric >= 0 && numeric <= 3) {
        return numeric;
      }
      if (numeric >= 1 && numeric <= 4) {
        return numeric - 1;
      }
    }

    const upper = token.toUpperCase();
    const optionLetterMatch = upper.match(/^(?:OPTION\s*)?([A-D])$/);
    if (optionLetterMatch?.[1]) {
      return optionLetterMatch[1].charCodeAt(0) - 65;
    }

    if (/^[A-D]$/.test(upper)) {
      return upper.charCodeAt(0) - 65;
    }

    const byText = options.findIndex((option) => option.toLowerCase() === token.toLowerCase());
    if (byText >= 0) {
      return byText;
    }
  }

  return 0;
}

function extractAnswerIndexFromExplanation(explanation: string, optionsLength: number): number | null {
  const normalized = explanation
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const match = normalized.match(/(?:dap\s*an\s*dung\s*la|correct\s*answer\s*(?:is|:))\s*([a-d])/i);
  if (!match?.[1]) {
    return null;
  }

  const index = match[1].toUpperCase().charCodeAt(0) - 65;
  if (index < 0 || index >= optionsLength) {
    return null;
  }

  return index;
}

function normalizeExplanationAnswerLabel(explanation: string, rightOptionIndex: number): string {
  const text = explanation.trim();
  if (!text) {
    return text;
  }

  const expectedLabel = String.fromCharCode(65 + Math.max(0, Math.min(3, rightOptionIndex)));
  const patterns = [
    /([Đđ]áp\s*án\s*đúng\s*là\s*)([A-D])/,
    /(Dap\s*an\s*dung\s*la\s*)([A-D])/i,
    /(Correct\s*answer\s*(?:is|:)\s*)([A-D])/i,
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return text.replace(pattern, `$1${expectedLabel}`);
    }
  }

  return text;
}

function extractAssignmentItems(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) {
    return payload.map((item) => asRecord(item)).filter((item): item is UnknownRecord => Boolean(item));
  }

  const record = asRecord(payload);
  if (!record) {
    return [];
  }

  const candidates = readArrayFromKeys(record, ["Questions", "questions", "items", "Items", "data", "Data"]);
  if (candidates.length > 0) {
    return candidates.map((item) => asRecord(item)).filter((item): item is UnknownRecord => Boolean(item));
  }

  if (record.Question || record.question || record.q || record.prompt) {
    return [record];
  }

  return [];
}

function toQuizQuestion(record: UnknownRecord, index: number, topic: string): QuizQuestion {
  const arrayOptions = readArrayFromKeys(record, ["Options", "options", "choices", "Choices"]);
  const objectOptions = readObjectFromKeys(record, ["Options", "options", "choices", "Choices", "optionMap", "OptionMap"]);
  const keyedOptions = [
    record.optionA,
    record.optionB,
    record.optionC,
    record.optionD,
    record.OptionA,
    record.OptionB,
    record.OptionC,
    record.OptionD,
  ];

  const rawOptions =
    arrayOptions.length > 0
      ? arrayOptions
      : objectOptions
        ? optionsFromObject(objectOptions)
        : keyedOptions;

  const options = normalizeOptions(rawOptions);
  const questionText =
    readStringFromKeys(record, ["Question", "question", "QuestionText", "questionText", "q", "prompt"]) ||
    `Question ${index + 1} about ${topic}`;

  let rightOptionIndex = normalizeRightOptionIndex(
    record.RightOptionIndex
      ?? record.rightOptionIndex
      ?? record.correctAnswer
      ?? record.CorrectAnswer
      ?? record.answer
      ?? record.Answer
      ?? record.correctOption
      ?? record.CorrectOption
      ?? record.correct
      ?? record.Correct,
    options,
  );

  const rawExplanation =
    readStringFromKeys(record, [
      "ExplanationInVietnamese",
      "explanationInVietnamese",
      "Explanation",
      "explanation",
      "reason",
      "Reason",
    ]) ||
    `Đáp án đúng là "${options[rightOptionIndex] ?? "A"}" vì phù hợp ngữ cảnh và cấu trúc ngữ pháp của câu.`;

  const explanationIndex = extractAnswerIndexFromExplanation(rawExplanation, options.length);
  if (typeof explanationIndex === "number") {
    rightOptionIndex = explanationIndex;
  }

  const explanation = normalizeExplanationAnswerLabel(rawExplanation, rightOptionIndex);

  return {
    Question: questionText,
    Options: options,
    RightOptionIndex: rightOptionIndex,
    ExplanationInVietnamese: explanation,
  };
}

export async function generateAssignments(input: GenerateAssignmentInput): Promise<{ status: number; error?: string; data?: QuizQuestion[] }> {
  const validationError = ensureValidInput(input);
  if (validationError) {
    return { status: 400, error: validationError };
  }

  const provider = normalizeProvider(input.provider);
  if (!provider) {
    return { status: 400, error: "Unsupported provider" };
  }

  const topic = input.Topic.trim();
  const totalQuestions = Number(input.TotalQuestions);
  const assignmentTypes = input.AssignmentTypes;
  const levelDescription = ENGLISH_LEVELS[input.EnglishLevel] ?? ENGLISH_LEVELS[3] ?? "Intermediate";
  const assignmentTypeText = assignmentTypes
    .map((t) => `${t}: ${ASSIGNMENT_TYPES[t] ?? "Unknown"}`)
    .join("; ");

  const systemPrompt = loadPromptTemplate("assignment.system.prompt.txt");
  const userPrompt = [
    `Topic: ${topic}`,
    `English level: ${input.EnglishLevel} - ${levelDescription}`,
    `TotalQuestions: ${totalQuestions}`,
    `AssignmentTypes: ${assignmentTypeText}`,
    "Return ONLY JSON array with exactly TotalQuestions items.",
  ].join("\n");

  try {
    const data = await generateJsonFromProvider<unknown>({
      provider,
      systemPrompt,
      userPrompt,
      temperature: 0.4,
    });

    const normalized = extractAssignmentItems(data)
      .slice(0, totalQuestions)
      .map((item, index) => toQuizQuestion(item, index, topic));

    if (normalized.length === 0) {
      return { status: 502, error: "AI returned empty questions" };
    }

    if (normalized.length < totalQuestions) {
      for (let i = normalized.length; i < totalQuestions; i += 1) {
        normalized.push({
          Question: `Question ${i + 1} about ${topic}`,
          Options: ["Option A", "Option B", "Option C", "Option D"],
          RightOptionIndex: 0,
          ExplanationInVietnamese: "Dựa vào ngữ cảnh để chọn đáp án phù hợp nhất.",
        });
      }
    }

    return { status: 201, data: normalized.slice(0, totalQuestions) };
  } catch (error) {
    return {
      status: getHttpStatusFromError(error, 502),
      error: error instanceof Error ? error.message : "Failed to generate assignments from provider",
    };
  }
}

export function getAssignmentEnglishLevels(): Record<number, string> {
  return ENGLISH_LEVELS;
}

export function getAssignmentTypes(): Record<number, string> {
  return ASSIGNMENT_TYPES;
}

export async function suggestTopics(englishLevel: number, provider?: string): Promise<string[]> {
  const selectedProvider = normalizeProvider(provider);
  const level = Number.isInteger(englishLevel) ? englishLevel : 3;
  if (!selectedProvider) {
    return LEVEL_TOPICS[level] ?? DEFAULT_TOPIC_LIST;
  }

  const levelDescription = ENGLISH_LEVELS[level] ?? ENGLISH_LEVELS[3] ?? "Intermediate";
  const systemPrompt = loadPromptTemplate("assignment-topics.system.prompt.txt");
  const userPrompt = [
    `Level: ${level} - ${levelDescription}`,
    "Return JSON array with 20 concise topic strings for English practice.",
    "Each topic must be under 6 words.",
  ].join("\n");

  try {
    const parsed = await generateJsonFromProvider<string[]>({
      provider: selectedProvider,
      systemPrompt,
      userPrompt,
      temperature: 0.5,
    });

    if (Array.isArray(parsed)) {
      const topics = parsed.map((item) => String(item ?? "").trim()).filter((item) => item.length > 0).slice(0, 30);
      if (topics.length > 0) {
        return topics;
      }
    }
  } catch {
    // Fallback to static topics if provider output is invalid.
  }

  return LEVEL_TOPICS[level] ?? DEFAULT_TOPIC_LIST;
}
