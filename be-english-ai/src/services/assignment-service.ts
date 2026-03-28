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
    const data = await generateJsonFromProvider<QuizQuestion[]>({
      provider,
      systemPrompt,
      userPrompt,
      temperature: 0.4,
    });

    const normalized = (Array.isArray(data) ? data : []).slice(0, totalQuestions).map((q) => ({
      Question: String(q.Question ?? "").trim(),
      Options: Array.isArray(q.Options) ? q.Options.slice(0, 4).map((x) => String(x ?? "").trim()) : [],
      RightOptionIndex: Number(q.RightOptionIndex ?? 0),
      ExplanationInVietnamese: String(q.ExplanationInVietnamese ?? "").trim(),
    }));

    if (normalized.length === 0) {
      return { status: 502, error: "AI returned empty questions" };
    }

    for (const item of normalized) {
      if (!item.Question || item.Options.length !== 4 || item.RightOptionIndex < 0 || item.RightOptionIndex > 3) {
        return { status: 502, error: "AI returned invalid assignment format" };
      }
    }

    return { status: 201, data: normalized };
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
