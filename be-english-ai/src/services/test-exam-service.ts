import { randomUUID } from "node:crypto";
import { generateJsonFromProvider } from "./ai/ai-client";
import { loadPromptTemplate } from "./ai/prompt-loader";
import { appConfig } from "../config";
import { exerciseRepository } from "../database/repositories/exercise-repository";
import { testExamRepository, type TestExamDbRow } from "../database/repositories/test-exam-repository";
import { logger } from "../utils/logger";

export type ToeicPartStatus = "pending" | "ready" | "failed";
export type ExamStatus = "generating" | "ready" | "failed";

export interface TestExamOption {
  label: string;
  value: string;
  content: string;
}

export interface TestExamQuestion {
  questionId: string;
  questionNumber: number;
  prompt: string;
  options: TestExamOption[];
  correctAnswer: string;
  explanation: string;
  audioText?: string;
  audioUrl?: string;
  audioSegments?: string[];
}

export interface TestExamPart {
  partNumber: number;
  partTitle: string;
  description: string;
  isListening: boolean;
  status: ToeicPartStatus;
  audioText?: string;
  audioUrl?: string;
  audioSegments?: string[];
  questions: TestExamQuestion[];
  errorMessage?: string;
}

export interface TestExamDetail {
  testId: string;
  title: string;
  topic: string;
  estimatedMinutes: number;
  isRealExamMode: boolean;
  createdAt: string;
  updatedAt: string;
  status: ExamStatus;
  generation: {
    currentPart: number;
    completedParts: number;
    totalParts: number;
    message: string;
  };
  parts: TestExamPart[];
}

export interface TestExamSummary {
  testId: string;
  title: string;
  topic: string;
  estimatedMinutes: number;
  status: ExamStatus;
  readyPartCount: number;
  totalPartCount: number;
  questionCount: number;
  createdAt: string;
}

type CreateTestExamInput = {
  topic?: string;
  isRealExamMode?: boolean;
  isFullTest?: boolean;
  selectedParts?: number[];
};

type PartDefinition = {
  partNumber: number;
  partTitle: string;
  description: string;
  isListening: boolean;
  questionCount: number;
};

type PartAiQuestionPayload = {
  prompt?: string;
  question?: string;
  options?: Array<string | { content?: string; text?: string; label?: string }>;
  correctAnswer?: string | number;
  explanation?: string;
  audioText?: string;
};

type PartAiPayload = {
  partTitle?: string;
  description?: string;
  audioText?: string;
  questions?: PartAiQuestionPayload[];
  data?: unknown;
  result?: unknown;
};

const TOEIC_PART_PROMPT_FILE = "test-exam-toeic-part.system.prompt.txt";
const MAX_EXAMS = 80;
const GOOGLE_TTS_MAX_CHARS = 180;

const partDefinitions: PartDefinition[] = [
  {
    partNumber: 1,
    partTitle: "Part 1 - Short Descriptions (No Images)",
    description:
      "Thay cho dạng nhìn tranh, bạn nghe mô tả ngắn về bối cảnh và chọn phương án phù hợp nhất. Không sử dụng hình ảnh.",
    isListening: true,
    questionCount: 6,
  },
  {
    partNumber: 2,
    partTitle: "Part 2 - Question-Response",
    description: "Nghe câu hỏi hoặc câu nói ngắn và chọn câu trả lời phù hợp nhất.",
    isListening: true,
    questionCount: 8,
  },
  {
    partNumber: 3,
    partTitle: "Part 3 - Conversations",
    description: "Nghe hội thoại ngắn và trả lời các câu hỏi thông tin chi tiết.",
    isListening: true,
    questionCount: 8,
  },
  {
    partNumber: 4,
    partTitle: "Part 4 - Short Talks",
    description: "Nghe bài nói ngắn (thông báo, bản tin, hướng dẫn) và chọn đáp án đúng.",
    isListening: true,
    questionCount: 8,
  },
  {
    partNumber: 5,
    partTitle: "Part 5 - Incomplete Sentences",
    description: "Chọn từ/cụm từ phù hợp nhất để hoàn thành câu.",
    isListening: false,
    questionCount: 10,
  },
  {
    partNumber: 6,
    partTitle: "Part 6 - Text Completion",
    description: "Đọc đoạn văn ngắn và chọn đáp án phù hợp để điền vào chỗ trống.",
    isListening: false,
    questionCount: 8,
  },
  {
    partNumber: 7,
    partTitle: "Part 7 - Reading Comprehension",
    description: "Đọc email/thông báo/đoạn văn và trả lời câu hỏi hiểu ý.",
    isListening: false,
    questionCount: 10,
  },
];

const suggestedTopics = [
  "Công việc văn phòng",
  "Du lịch công tác",
  "Dịch vụ khách hàng",
  "Họp nhóm và dự án",
  "Mua sắm và logistics",
  "Công nghệ nơi làm việc",
  "Marketing và bán hàng",
  "Đặt lịch và sự kiện",
];

const examStore = new Map<string, TestExamDetail>();
const examOrder: string[] = [];
const generatingExams = new Set<string>();

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readFirstString(record: Record<string, unknown>, keys: string[]): string {
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

function readFirstArray(record: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function normalizeAudioSegments(raw: unknown[]): string[] {
  return raw
    .map((item) => String(item ?? "").trim())
    .filter((item) => item.length > 0);
}

function normalizeTopic(topic?: string): string {
  const trimmed = (topic ?? "").trim();
  return trimmed || (suggestedTopics[0] ?? "Luyện thi TOEIC tổng hợp");
}

function normalizeSelectedPartDefinitions(input: CreateTestExamInput): PartDefinition[] {
  if (input.isFullTest !== false) {
    return [...partDefinitions];
  }

  const selected = Array.isArray(input.selectedParts)
    ? Array.from(new Set(input.selectedParts)).filter((partNumber) => Number.isInteger(partNumber) && partNumber >= 1 && partNumber <= 7)
    : [];

  if (selected.length === 0) {
    return [...partDefinitions];
  }

  const selectedSet = new Set(selected);
  const definitions = partDefinitions.filter((part) => selectedSet.has(part.partNumber));

  return definitions.length > 0 ? definitions : [...partDefinitions];
}

function estimateMinutesByQuestionCount(questionCount: number): number {
  return Math.max(20, Math.ceil(questionCount * 1.5));
}

function getDefinitionByPartNumber(partNumber: number): PartDefinition | undefined {
  return partDefinitions.find((part) => part.partNumber === partNumber);
}

function splitTextIntoTtsChunks(text: string, maxChars: number): string[] {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return [];
  }

  const sentencePieces = normalized.match(/[^.!?]+[.!?]?/g) ?? [normalized];
  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) {
      chunks.push(current.trim());
    }
    current = "";
  };

  for (const sentence of sentencePieces) {
    const piece = sentence.trim();
    if (!piece) {
      continue;
    }

    if (piece.length > maxChars) {
      pushCurrent();
      const words = piece.split(/\s+/).filter(Boolean);
      let wordChunk = "";

      for (const word of words) {
        const candidate = wordChunk ? `${wordChunk} ${word}` : word;
        if (candidate.length <= maxChars) {
          wordChunk = candidate;
          continue;
        }

        if (wordChunk) {
          chunks.push(wordChunk.trim());
        }
        wordChunk = word;
      }

      if (wordChunk.trim()) {
        chunks.push(wordChunk.trim());
      }
      continue;
    }

    const candidate = current ? `${current} ${piece}` : piece;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    pushCurrent();
    current = piece;
  }

  pushCurrent();
  return chunks;
}

function buildFallbackAudioUrls(text: string): string[] {
  const chunks = splitTextIntoTtsChunks(text, GOOGLE_TTS_MAX_CHARS);
  if (chunks.length === 0) {
    return [];
  }

  const total = chunks.length;
  return chunks.map((chunk, index) => {
    const query = encodeURIComponent(chunk);
    return [
      "https://translate.google.com/translate_tts?ie=UTF-8",
      "client=tw-ob",
      "tl=en",
      "ttsspeed=0.95",
      `q=${query}`,
      `idx=${index}`,
      `total=${total}`,
      `textlen=${chunk.length}`,
    ].join("&");
  });
}

function buildFallbackAudioUrl(text: string): string {
  return buildFallbackAudioUrls(text)[0] ?? "";
}

function optionLabelAt(index: number): string {
  return String.fromCharCode(65 + index);
}

function expectedOptionCount(definition: PartDefinition): number {
  return definition.partNumber === 2 ? 3 : 4;
}

function hasBlankToken(prompt: string): boolean {
  return /_{3,}|\[\s*blank\s*\]|\(\s*blank\s*\)|\(\s*\d+\s*\)/i.test(prompt);
}

function looksLikeComprehensionQuestion(prompt: string): boolean {
  const normalized = prompt.trim();
  if (!normalized) {
    return false;
  }

  if (normalized.includes("?")) {
    return true;
  }

  return /^(what|why|how|when|where|who|which)\b/i.test(normalized);
}

function isValidPart6Prompt(prompt: string): boolean {
  if (!prompt.trim()) {
    return false;
  }

  return hasBlankToken(prompt) && !looksLikeComprehensionQuestion(prompt);
}

function sanitizeOptionContent(rawContent: string, expectedLabel: string): string {
  const expectedPrefixPattern = new RegExp(`^${expectedLabel}[\\.\\):\\-]\\s*`, "i");
  const genericPrefixPattern = /^[A-D][\.\):\-]\s*/i;
  return rawContent.trim().replace(expectedPrefixPattern, "").replace(genericPrefixPattern, "").trim();
}

function buildDefaultOptions(seed: string, optionCount = 4): TestExamOption[] {
  return Array.from({ length: optionCount }, (_, index) => {
    const label = optionLabelAt(index);
    return {
      label,
      value: label,
      content: `${seed} option ${label}`,
    };
  });
}

function normalizeOptions(raw: readonly unknown[], optionCount = 4): TestExamOption[] {
  const options = raw
    .map((item, index) => {
      if (typeof item === "string") {
        const label = optionLabelAt(index);
        const content = sanitizeOptionContent(item, label);
        if (!content) {
          return null;
        }

        return {
          label,
          value: label,
          content,
        } satisfies TestExamOption;
      }

      const record = asRecord(item);
      if (!record) {
        return null;
      }

      const label = readFirstString(record, ["label", "value"]).toUpperCase() || optionLabelAt(index);
      const content = sanitizeOptionContent(readFirstString(record, ["content", "text", "option"]), label);
      if (!content) {
        return null;
      }

      return {
        label,
        value: label,
        content,
      } satisfies TestExamOption;
    })
    .filter((item): item is TestExamOption => Boolean(item))
    .slice(0, optionCount);

  if (options.length < optionCount) {
    return buildDefaultOptions("Fallback", optionCount);
  }

  return options.map((item, index) => ({
    label: optionLabelAt(index),
    value: optionLabelAt(index),
    content: item.content,
  }));
}

function resolveCorrectAnswer(raw: unknown, options: TestExamOption[]): string {
  const rawValue = String(raw ?? "").trim().toUpperCase();
  if (options.some((option) => option.label === rawValue)) {
    return rawValue;
  }

  const rawIndex = Number(raw);
  if (Number.isInteger(rawIndex)) {
    const normalized = rawIndex >= 1 && rawIndex <= options.length ? rawIndex - 1 : rawIndex;
    const safeIndex = Math.max(0, Math.min(options.length - 1, normalized));
    return options[safeIndex]?.label || "A";
  }

  return "A";
}

function normalizePromptByPart(definition: PartDefinition, rawPrompt: string): string {
  const compact = rawPrompt.replace(/\s+/g, " ").trim();
  if (!compact) {
    return compact;
  }

  if (definition.partNumber === 2) {
    return compact
      .replace(/^question\s*\d+[\.:\-)\s]*/i, "")
      .replace(/^part\s*2[\s:\-]*/i, "")
      .trim();
  }

  return compact;
}

function normalizeConversationScriptForSpeech(text: string): string {
  return text
    .replace(/(^|\n)\s*W\s*:/gi, "$1Woman: ")
    .replace(/(^|\n)\s*M\s*:/gi, "$1Man: ")
    .replace(/(^|\n)\s*A\s*:/gi, "$1Speaker A: ")
    .replace(/(^|\n)\s*B\s*:/gi, "$1Speaker B: ")
    .replace(/\bW-A\b/gi, "Woman and Man")
    .replace(/\bWA\b/g, "Woman and Man")
    .replace(/\s+/g, " ")
    .trim();
}

function buildEffectiveQuestionAudioText(
  definition: PartDefinition,
  prompt: string,
  questionAudioText: string,
  partAudioText: string,
): string {
  const normalizedPrompt = prompt.trim();
  const normalizedQuestionAudioText = questionAudioText.trim();
  const normalizedPartAudioText = partAudioText.trim().toLowerCase();

  const looksLikePartIntro =
    normalizedQuestionAudioText.length > 0 &&
    (normalizedQuestionAudioText.toLowerCase() === normalizedPartAudioText ||
      /you\s+are\s+(now\s+)?listening\s+to\s+part|this\s+is\s+toeic\s+part/i.test(normalizedQuestionAudioText));

  let effective = looksLikePartIntro
    ? normalizedPrompt
    : normalizedQuestionAudioText || normalizedPrompt;

  if (definition.partNumber === 3) {
    effective = normalizeConversationScriptForSpeech(effective);
  }

  return effective;
}

function fallbackPart2Question(topic: string, questionNumber: number): TestExamQuestion {
  const templates = [
    {
      prompt: "Could you send me the updated sales report by noon?",
      options: [
        "Sure, I will email it to you before lunch.",
        "At the main reception desk.",
        "It was very expensive.",
      ],
      correctAnswer: "A",
      explanation: "Câu trả lời A phù hợp trực tiếp với yêu cầu gửi báo cáo trước buổi trưa.",
    },
    {
      prompt: "Where should I submit the reimbursement form?",
      options: [
        "I submitted it last month.",
        "Please send it to the finance department.",
        "It takes about ten minutes.",
      ],
      correctAnswer: "B",
      explanation: "Câu hỏi hỏi địa điểm nộp biểu mẫu, nên đáp án B là phù hợp nhất.",
    },
    {
      prompt: "Why was the client meeting postponed?",
      options: [
        "Because the manager is on a business trip today.",
        "At three o'clock in the afternoon.",
        "Yes, I can postpone it.",
      ],
      correctAnswer: "A",
      explanation: "Câu hỏi hỏi lý do, và đáp án A cung cấp nguyên nhân rõ ràng.",
    },
  ] as const;

  const selected = templates[(questionNumber - 1) % templates.length] ?? templates[0]!;
  const options = normalizeOptions(selected.options, 3);
  const audioText = `Question ${questionNumber}. ${selected.prompt}`;
  const audioSegments = buildFallbackAudioUrls(audioText);

  return {
    questionId: randomUUID(),
    questionNumber,
    prompt: selected.prompt,
    options,
    correctAnswer: selected.correctAnswer,
    explanation: `${selected.explanation} Chủ đề luyện tập: ${topic}.`,
    audioText,
    ...(audioSegments.length > 0
      ? {
          audioUrl: audioSegments[0],
          audioSegments,
        }
      : {}),
  };
}

function fallbackPart6Question(topic: string, questionNumber: number): TestExamQuestion {
  const templates = [
    {
      prompt: "Dear customer, our support team will ____ your request within 24 hours.",
      options: ["review", "reviews", "reviewed", "reviewing"],
      correctAnswer: "A",
      explanation: "Sau will dùng động từ nguyên mẫu, nên đáp án đúng là review.",
    },
    {
      prompt: "Please keep your receipt, ____ you may need it for a refund.",
      options: ["because", "but", "although", "unless"],
      correctAnswer: "A",
      explanation: "Liên từ because diễn tả lý do phù hợp nhất trong ngữ cảnh chăm sóc khách hàng.",
    },
    {
      prompt: "The manager apologized for the delay and promised to respond ____.",
      options: ["promptly", "prompt", "promptness", "more prompt"],
      correctAnswer: "A",
      explanation: "Chỗ trống cần trạng từ bổ nghĩa cho động từ respond, nên dùng promptly.",
    },
    {
      prompt: "If you have any questions, please ____ our service center by phone.",
      options: ["contact", "contacts", "contacted", "contacting"],
      correctAnswer: "A",
      explanation: "Sau please là động từ nguyên mẫu, nên contact là đúng.",
    },
  ] as const;

  const selected = templates[(questionNumber - 1) % templates.length] ?? templates[0]!;
  const options = normalizeOptions(selected.options, 4);

  return {
    questionId: randomUUID(),
    questionNumber,
    prompt: selected.prompt,
    options,
    correctAnswer: selected.correctAnswer,
    explanation: `${selected.explanation} Chủ đề luyện tập: ${topic}.`,
  };
}

function fallbackQuestion(definition: PartDefinition, topic: string, questionNumber: number): TestExamQuestion {
  if (definition.partNumber === 2) {
    return fallbackPart2Question(topic, questionNumber);
  }

  if (definition.partNumber === 6) {
    return fallbackPart6Question(topic, questionNumber);
  }

  const isListening = definition.isListening;
  const audioText = isListening
    ? `This is TOEIC ${definition.partTitle}. Topic is ${topic}. Question ${questionNumber}. Please choose the best answer.`
    : undefined;
  const audioSegments = audioText ? buildFallbackAudioUrls(audioText) : [];
  const prompt =
    definition.partNumber <= 4
      ? `Listen and choose the best answer for question ${questionNumber} about ${topic}.`
      : `Choose the best answer for question ${questionNumber} in ${definition.partTitle} about ${topic}.`;

  return {
    questionId: randomUUID(),
    questionNumber,
    prompt,
    options: buildDefaultOptions(`Question ${questionNumber}`, expectedOptionCount(definition)),
    correctAnswer: "A",
    explanation: "Đáp án A phù hợp nhất với ngữ cảnh câu hỏi theo định dạng TOEIC.",
    ...(audioText
      ? {
          audioText,
          ...(audioSegments.length > 0
            ? {
                audioUrl: audioSegments[0],
                audioSegments,
              }
            : {}),
        }
      : {}),
  };
}

function fallbackPart(definition: PartDefinition, topic: string): TestExamPart {
  const questions = Array.from({ length: definition.questionCount }, (_, index) =>
    fallbackQuestion(definition, topic, index + 1),
  );

  const partAudioText = definition.isListening
    ? `You are now listening to ${definition.partTitle}. Topic is ${topic}.`
    : undefined;
  const partAudioSegments = partAudioText ? buildFallbackAudioUrls(partAudioText) : [];

  return {
    partNumber: definition.partNumber,
    partTitle: definition.partTitle,
    description: definition.description,
    isListening: definition.isListening,
    status: "ready",
    ...(partAudioText
      ? {
          audioText: partAudioText,
          ...(partAudioSegments.length > 0
            ? {
                audioUrl: partAudioSegments[0],
                audioSegments: partAudioSegments,
              }
            : {}),
        }
      : {}),
    questions,
  };
}

function buildPartUserPrompt(definition: PartDefinition, topic: string): string {
  const optionCount = expectedOptionCount(definition);
  const partSpecificRules: string[] = [`Each question has exactly ${optionCount} options.`];

  if (definition.partNumber === 2) {
    partSpecificRules.push(
      "Part 2 must strictly follow TOEIC Question-Response format.",
      "Each question prompt is ONE short spoken English question/statement.",
      "Each question has exactly 3 response options (A, B, C).",
      "Options must be natural spoken responses, not sentence-completion choices.",
      "Do not return conversation scripts in Part 2 prompt/audioText.",
    );
  }

  if (definition.partNumber === 3) {
    partSpecificRules.push(
      "Part 3 prompts/audioText must contain short conversations with natural speakers.",
      "Use full speaker labels like 'Man:' and 'Woman:' or real names.",
      "Never use short codes like W:, M:, A:, B:, WA, or W-A.",
    );
  }

  if (definition.partNumber === 6) {
    partSpecificRules.push(
      "Part 6 must be TOEIC Text Completion (cloze), not reading comprehension Q&A.",
      "Each prompt must include at least one blank token such as ____.",
      "Do not ask comprehension questions like 'What is the purpose...?' or 'Why...?' in Part 6.",
      "Options should be short words/phrases that fit the blank grammatically and semantically.",
    );
  }

  if (definition.partNumber === 7) {
    partSpecificRules.push(
      "Part 7 is reading comprehension Q&A and should not use blank-filling format.",
    );
  }

  return [
    `Topic: ${topic}`,
    `Part number: ${definition.partNumber}`,
    `Part title: ${definition.partTitle}`,
    `Part description in Vietnamese: ${definition.description}`,
    `Question count: ${definition.questionCount}`,
    `Listening part: ${definition.isListening ? "yes" : "no"}`,
    ...partSpecificRules,
    "No image-based question is allowed.",
    "Do not prefix options with labels like A., B), C: because labels are rendered by client.",
    "Use English for prompt/options/audioText and Vietnamese for explanation.",
    "Return strict JSON only.",
  ].join("\n");
}

function normalizeAiPart(rawPayload: unknown, definition: PartDefinition, topic: string): TestExamPart {
  const payloadRoot = asRecord(rawPayload) ?? {};
  const root = asRecord(payloadRoot.data) ?? asRecord(payloadRoot.result) ?? payloadRoot;

  const partTitle = readFirstString(root, ["partTitle", "title"]) || definition.partTitle;
  const description = readFirstString(root, ["description"]) || definition.description;
  const partAudioText = readFirstString(root, ["audioText", "script"]);
  const rawQuestions = readFirstArray(root, ["questions", "items"]);

  const questions: TestExamQuestion[] = [];
  for (let index = 0; index < rawQuestions.length; index += 1) {
    const item = rawQuestions[index];
      const record = asRecord(item);
      if (!record) {
        continue;
      }

      const prompt = normalizePromptByPart(
        definition,
        readFirstString(record, ["prompt", "question", "questionText"]),
      );
      if (!prompt) {
        continue;
      }

      if (definition.partNumber === 6 && !isValidPart6Prompt(prompt)) {
        continue;
      }

      const options = normalizeOptions(
        readFirstArray(record, ["options", "choices", "answers"]),
        expectedOptionCount(definition),
      );
      const correctAnswer = resolveCorrectAnswer(record.correctAnswer, options);
      const explanation =
        readFirstString(record, ["explanation", "reason"]) ||
        "Đáp án đúng được xác định dựa trên ngữ cảnh và từ khóa chính trong câu hỏi.";
      const questionAudioText = readFirstString(record, ["audioText", "script"]);
      const effectiveQuestionAudioText = buildEffectiveQuestionAudioText(
        definition,
        prompt,
        questionAudioText,
        partAudioText,
      );
      const questionAudioSegments =
        definition.isListening && effectiveQuestionAudioText
          ? buildFallbackAudioUrls(effectiveQuestionAudioText)
          : [];

      questions.push({
        questionId: randomUUID(),
        questionNumber: index + 1,
        prompt,
        options,
        correctAnswer,
        explanation,
        ...(definition.isListening && effectiveQuestionAudioText
          ? {
              audioText: effectiveQuestionAudioText,
              ...(questionAudioSegments.length > 0
                ? {
                    audioUrl: questionAudioSegments[0],
                    audioSegments: questionAudioSegments,
                  }
                : {}),
            }
          : {}),
      });

      if (questions.length >= definition.questionCount) {
        break;
      }
  }

  while (questions.length < definition.questionCount) {
    questions.push(fallbackQuestion(definition, topic, questions.length + 1));
  }

  const effectivePartAudioText = partAudioText || `You are listening to ${partTitle}. Topic is ${topic}.`;
  const partAudioSegments = definition.isListening
    ? buildFallbackAudioUrls(effectivePartAudioText)
    : [];

  return {
    partNumber: definition.partNumber,
    partTitle,
    description,
    isListening: definition.isListening,
    status: "ready",
    ...(definition.isListening
      ? {
          audioText: effectivePartAudioText,
          ...(partAudioSegments.length > 0
            ? {
                audioUrl: partAudioSegments[0],
                audioSegments: partAudioSegments,
              }
            : {}),
        }
      : {}),
    questions,
  };
}

async function buildPart(definition: PartDefinition, topic: string): Promise<TestExamPart> {
  try {
    const systemPrompt = loadPromptTemplate(TOEIC_PART_PROMPT_FILE);
    const userPrompt = buildPartUserPrompt(definition, topic);
    const aiPayload = await generateJsonFromProvider<PartAiPayload>({
      provider: "openai",
      systemPrompt,
      userPrompt,
      temperature: 0.35,
    });

    return normalizeAiPart(aiPayload, definition, topic);
  } catch (error) {
    logger.warn("Test exam part generation failed, using fallback", {
      message: error instanceof Error ? error.message : String(error),
      partNumber: definition.partNumber,
      topic,
    });
    return fallbackPart(definition, topic);
  }
}

function countQuestions(detail: TestExamDetail): number {
  return detail.parts.reduce((total, part) => total + part.questions.length, 0);
}

function toSummary(detail: TestExamDetail): TestExamSummary {
  const readyPartCount = detail.parts.filter((part) => part.status === "ready").length;

  return {
    testId: detail.testId,
    title: detail.title,
    topic: detail.topic,
    estimatedMinutes: detail.estimatedMinutes,
    status: detail.status,
    readyPartCount,
    totalPartCount: detail.generation.totalParts,
    questionCount: countQuestions(detail),
    createdAt: detail.createdAt,
  };
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function mapExamStatusToDbStatus(status: ExamStatus): "draft" | "generated" | "archived" {
  switch (status) {
    case "ready":
      return "generated";
    case "failed":
      return "archived";
    default:
      return "draft";
  }
}

function mapDbStatusToExamStatus(status: string): ExamStatus {
  const normalized = status.trim().toLowerCase();
  if (normalized === "generated") {
    return "ready";
  }

  if (normalized === "archived") {
    return "failed";
  }

  return "generating";
}

function toStoredExamPayload(detail: TestExamDetail): Omit<TestExamDetail, "testId"> {
  return {
    title: detail.title,
    topic: detail.topic,
    estimatedMinutes: detail.estimatedMinutes,
    isRealExamMode: detail.isRealExamMode,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
    status: detail.status,
    generation: detail.generation,
    parts: detail.parts,
  };
}

function hydrateDetailFromRow(row: TestExamDbRow): TestExamDetail {
  const parsed = parseJson<Partial<TestExamDetail>>(row.noiDungJson);
  const topic = typeof parsed?.topic === "string" && parsed.topic.trim().length > 0
    ? parsed.topic
    : "Luyện thi TOEIC tổng hợp";
  const nowIso = row.ngayTao.toISOString();
  const parts = Array.isArray(parsed?.parts) ? parsed.parts : [];
  const safeParts = parts
    .map((part) => {
      const record = asRecord(part);
      if (!record) {
        return null;
      }

      const partNumber = Number(record.partNumber);
      const definition = getDefinitionByPartNumber(partNumber);
      const isListening = typeof record.isListening === "boolean"
        ? record.isListening
        : Boolean(definition?.isListening);
      const questionsRaw = Array.isArray(record.questions) ? record.questions : [];

      const questions = questionsRaw.map((question, index) => {
        const q = asRecord(question) ?? {};
        const prompt = readFirstString(q, ["prompt", "question", "questionText"]);
        const optionCount = expectedOptionCount(definition ?? {
          partNumber: Number.isInteger(partNumber) ? partNumber : 5,
          partTitle: "Part",
          description: "",
          isListening,
          questionCount: 4,
        });

        const options = normalizeOptions(readFirstArray(q, ["options", "choices", "answers"]), optionCount);
        const correctAnswer = resolveCorrectAnswer(q.correctAnswer, options);
        const questionAudioSegments = normalizeAudioSegments(
          readFirstArray(q, ["audioSegments", "AudioSegments"]),
        );
        const questionAudioUrl = readFirstString(q, ["audioUrl", "audioContent", "AudioContent"]);

        return {
          questionId: readFirstString(q, ["questionId"]) || randomUUID(),
          questionNumber: Number(q.questionNumber) || index + 1,
          prompt: prompt || `Question ${index + 1}`,
          options,
          correctAnswer,
          explanation:
            readFirstString(q, ["explanation", "reason"]) ||
            "Đáp án đúng được xác định theo ngữ cảnh câu hỏi.",
          ...(isListening
            ? {
                audioText: readFirstString(q, ["audioText", "script"]),
                ...(questionAudioSegments.length > 0
                  ? {
                      audioUrl: questionAudioSegments[0],
                      audioSegments: questionAudioSegments,
                    }
                  : questionAudioUrl
                    ? {
                        audioUrl: questionAudioUrl,
                        audioSegments: [questionAudioUrl],
                      }
                    : {}),
              }
            : {}),
        } as TestExamQuestion;
      });

      const partAudioSegments = normalizeAudioSegments(
        readFirstArray(record, ["audioSegments", "AudioSegments"]),
      );
      const partAudioUrl = readFirstString(record, ["audioUrl", "audioContent", "AudioContent"]);

      return {
        partNumber: Number.isInteger(partNumber) ? partNumber : 0,
        partTitle: readFirstString(record, ["partTitle", "title"]) || definition?.partTitle || "Part",
        description: readFirstString(record, ["description"]) || definition?.description || "",
        isListening,
        status: (readFirstString(record, ["status"]) as ToeicPartStatus) || "pending",
        ...(isListening
          ? {
              audioText: readFirstString(record, ["audioText", "script"]),
              ...(partAudioSegments.length > 0
                ? {
                    audioUrl: partAudioSegments[0],
                    audioSegments: partAudioSegments,
                  }
                : partAudioUrl
                  ? {
                      audioUrl: partAudioUrl,
                      audioSegments: [partAudioUrl],
                    }
                  : {}),
            }
          : {}),
        questions,
      } as TestExamPart;
    })
    .filter((part): part is TestExamPart => {
      return part !== null && Number.isInteger(part.partNumber) && part.partNumber > 0;
    });

  const totalParts = Number(parsed?.generation?.totalParts) || safeParts.length || row.tongSoPhan;
  const completedParts = Number(parsed?.generation?.completedParts) || safeParts.filter((part) => part.status === "ready").length;
  const currentPart = Number(parsed?.generation?.currentPart) || safeParts.find((part) => part.status !== "ready")?.partNumber || 1;
  const statusFromPayload = parsed?.status;

  return {
    testId: String(row.deThiAIId),
    title: typeof parsed?.title === "string" && parsed.title.trim().length > 0 ? parsed.title : row.tenDeThi,
    topic,
    estimatedMinutes: Number(parsed?.estimatedMinutes) || row.thoiGianLamDe,
    isRealExamMode: Boolean(parsed?.isRealExamMode),
    createdAt: typeof parsed?.createdAt === "string" ? parsed.createdAt : nowIso,
    updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : nowIso,
    status: statusFromPayload === "generating" || statusFromPayload === "ready" || statusFromPayload === "failed"
      ? statusFromPayload
      : mapDbStatusToExamStatus(row.trangThaiDeThi),
    generation: {
      currentPart,
      completedParts,
      totalParts,
      message:
        typeof parsed?.generation?.message === "string" && parsed.generation.message.trim().length > 0
          ? parsed.generation.message
          : "Đề thi đang được xử lý.",
    },
    parts: safeParts,
  };
}

async function resolveNguoiDungId(requestedByTaiKhoanId: number): Promise<number | null> {
  if (!Number.isInteger(requestedByTaiKhoanId) || requestedByTaiKhoanId <= 0) {
    return null;
  }

  return exerciseRepository.resolveNguoiDungIdByTaiKhoanId(requestedByTaiKhoanId);
}

async function persistExamToDb(testId: string, detail: TestExamDetail): Promise<void> {
  const deThiAIId = Number(testId);
  if (!Number.isInteger(deThiAIId) || deThiAIId <= 0) {
    return;
  }

  const updated = {
    ...detail,
    testId,
  };

  const saved = await testExamRepository.updateExam({
    deThiAIId,
    tenDeThi: updated.title,
    tongSoPhan: updated.generation.totalParts,
    tongSoBaiTap: countQuestions(updated),
    noiDungJson: JSON.stringify(toStoredExamPayload(updated)),
    thoiGianLamDe: updated.estimatedMinutes,
    trangThaiDeThi: mapExamStatusToDbStatus(updated.status),
  });

  if (!saved) {
    throw new Error("Unable to update DeThiAI");
  }
}

async function getExamForGeneration(testId: string): Promise<TestExamDetail | null> {
  if (!appConfig.db.enabled) {
    return examStore.get(testId) ?? null;
  }

  const deThiAIId = Number(testId);
  if (!Number.isInteger(deThiAIId) || deThiAIId <= 0) {
    return null;
  }

  const row = await testExamRepository.getById(deThiAIId);
  if (!row) {
    return null;
  }

  return hydrateDetailFromRow(row);
}

async function updateExam(testId: string, updater: (detail: TestExamDetail) => TestExamDetail): Promise<void> {
  if (!appConfig.db.enabled) {
    const current = examStore.get(testId);
    if (!current) {
      return;
    }

    const updated = updater(current);
    updated.updatedAt = new Date().toISOString();
    examStore.set(testId, updated);
    return;
  }

  const live = await getExamForGeneration(testId);
  if (!live) {
    return;
  }

  const updated = updater(live);
  updated.updatedAt = new Date().toISOString();
  await persistExamToDb(testId, updated);
}

async function generateRemainingParts(testId: string): Promise<void> {
  if (generatingExams.has(testId)) {
    return;
  }

  const existing = await getExamForGeneration(testId);
  if (!existing) {
    return;
  }

  generatingExams.add(testId);
  try {
    const sequence = existing.parts.map((part) => part.partNumber);

    for (const partNumber of sequence) {
      const definition = getDefinitionByPartNumber(partNumber);
      if (!definition) {
        continue;
      }

      const live = await getExamForGeneration(testId);
      if (!live) {
        return;
      }

      const livePart = live.parts.find((part) => part.partNumber === partNumber);
      if (!livePart || livePart.status === "ready") {
        continue;
      }

      await updateExam(testId, (current) => ({
        ...current,
        generation: {
          ...current.generation,
          currentPart: definition.partNumber,
          message: `Đang tạo ${definition.partTitle}...`,
        },
      }));

      const part = await buildPart(definition, live.topic);
      await updateExam(testId, (current) => {
        const parts = current.parts.map((item) =>
          item.partNumber === definition.partNumber ? part : item,
        );
        const completedParts = parts.filter((item) => item.status === "ready").length;
        const totalParts = parts.length;
        const nextPending = parts.find((item) => item.status !== "ready");
        const status: ExamStatus = completedParts === totalParts ? "ready" : "generating";

        return {
          ...current,
          status,
          parts,
          generation: {
            currentPart: nextPending?.partNumber ?? definition.partNumber,
            completedParts,
            totalParts,
            message:
              status === "ready"
                ? `Đã tạo xong ${totalParts} part đã chọn.`
                : `Đã xong ${definition.partTitle}. Đang chuẩn bị part tiếp theo...`,
          },
        };
      });
    }
  } catch (error) {
    logger.error("Background TOEIC generation failed", {
      message: error instanceof Error ? error.message : String(error),
      testId,
    });

    await updateExam(testId, (current) => ({
      ...current,
      status: "failed",
      generation: {
        ...current.generation,
        message: "Sinh đề bị lỗi ở một số part. Bạn vẫn có thể làm các part đã sẵn sàng.",
      },
    }));
  } finally {
    generatingExams.delete(testId);
  }
}

function storeExam(detail: TestExamDetail): void {
  examStore.set(detail.testId, detail);
  examOrder.unshift(detail.testId);

  if (examOrder.length > MAX_EXAMS) {
    const removed = examOrder.pop();
    if (removed) {
      examStore.delete(removed);
      generatingExams.delete(removed);
    }
  }
}

function buildInitialDetail(topic: string, isRealExamMode: boolean, selectedDefinitions: PartDefinition[]): TestExamDetail {
  const now = new Date().toISOString();
  const parts = selectedDefinitions.map((definition) => ({
    partNumber: definition.partNumber,
    partTitle: definition.partTitle,
    description: definition.description,
    isListening: definition.isListening,
    status: "pending" as ToeicPartStatus,
    questions: [],
  }));

  const questionCount = selectedDefinitions.reduce((sum, definition) => sum + definition.questionCount, 0);
  const firstPart = selectedDefinitions[0]?.partNumber ?? 1;

  return {
    testId: randomUUID(),
    title: `Đề TOEIC ${selectedDefinitions.length} Part - ${topic}`,
    topic,
    estimatedMinutes: estimateMinutesByQuestionCount(questionCount),
    isRealExamMode,
    createdAt: now,
    updatedAt: now,
    status: "generating",
    generation: {
      currentPart: firstPart,
      completedParts: 0,
      totalParts: selectedDefinitions.length,
      message: `Đang tạo Part ${firstPart} để bạn vào thi ngay...`,
    },
    parts,
  };
}

export function getTestExamSuggestedTopics(): string[] {
  return [...suggestedTopics];
}

export async function listTestExams(requestedByTaiKhoanId: number): Promise<TestExamSummary[]> {
  if (!appConfig.db.enabled) {
    return examOrder.map((testId) => toSummary(examStore.get(testId)!));
  }

  const nguoiDungId = await resolveNguoiDungId(requestedByTaiKhoanId);
  if (!nguoiDungId) {
    return [];
  }

  const rows = await testExamRepository.listByNguoiDungId(nguoiDungId, 100);
  return rows.map((row) => toSummary(hydrateDetailFromRow(row)));
}

export async function getTestExamById(input: {
  requestedByTaiKhoanId: number;
  testId: string;
}): Promise<TestExamDetail | null> {
  if (!appConfig.db.enabled) {
    return examStore.get(input.testId) ?? null;
  }

  const deThiAIId = Number(input.testId);
  if (!Number.isInteger(deThiAIId) || deThiAIId <= 0) {
    return null;
  }

  const nguoiDungId = await resolveNguoiDungId(input.requestedByTaiKhoanId);
  if (!nguoiDungId) {
    return null;
  }

  const row = await testExamRepository.getByIdForUser(deThiAIId, nguoiDungId);
  if (!row) {
    return null;
  }

  return hydrateDetailFromRow(row);
}

export async function createTestExam(input: CreateTestExamInput & { requestedByTaiKhoanId: number }): Promise<TestExamSummary> {
  const topic = normalizeTopic(input.topic);
  const selectedDefinitions = normalizeSelectedPartDefinitions(input);
  const detail = buildInitialDetail(topic, Boolean(input.isRealExamMode), selectedDefinitions);

  const firstDefinition = selectedDefinitions[0]!;
  const firstPart = await buildPart(firstDefinition, topic);
  firstPart.status = "ready";

  detail.parts = detail.parts.map((part) =>
    part.partNumber === firstDefinition.partNumber ? firstPart : part,
  );
  detail.generation.completedParts = 1;
  detail.generation.currentPart = selectedDefinitions[1]?.partNumber ?? firstDefinition.partNumber;

  if (selectedDefinitions.length === 1) {
    detail.status = "ready";
    detail.generation.message = `Đã tạo xong Part ${firstDefinition.partNumber}. Bạn có thể bắt đầu làm bài ngay.`;
  } else {
    detail.generation.message = `Part ${firstDefinition.partNumber} đã sẵn sàng. Bạn có thể bắt đầu làm bài ngay.`;
  }

  if (!appConfig.db.enabled) {
    storeExam(detail);
    if (selectedDefinitions.length > 1) {
      void generateRemainingParts(detail.testId);
    }

    return toSummary(detail);
  }

  const nguoiDungId = await resolveNguoiDungId(input.requestedByTaiKhoanId);
  if (!nguoiDungId) {
    throw new Error("Không xác định được người dùng để lưu đề thi.");
  }

  const createdId = await testExamRepository.createExam({
    nguoiDungId,
    tenDeThi: detail.title,
    kieuDeThi: "practice",
    tongSoPhan: detail.generation.totalParts,
    tongSoBaiTap: countQuestions(detail),
    noiDungJson: JSON.stringify(toStoredExamPayload(detail)),
    thoiGianLamDe: detail.estimatedMinutes,
    trangThaiDeThi: mapExamStatusToDbStatus(detail.status),
  });

  if (!createdId) {
    throw new Error("Không thể lưu đề thi vào DeThiAI.");
  }

  const detailWithDbId: TestExamDetail = {
    ...detail,
    testId: String(createdId),
  };

  if (selectedDefinitions.length > 1) {
    void generateRemainingParts(String(createdId));
  }

  return toSummary(detailWithDbId);
}
