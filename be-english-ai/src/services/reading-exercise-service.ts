import { ReadingExerciseRepository, type ReadingQuestionInput } from "../database/repositories/reading-exercise-repository";
import { appConfig } from "../config";
import { generateJsonFromProvider, type AiProvider } from "./ai/ai-client";
import { triggerLearningInsightsRefresh } from "./learning-insights-service";
import { loadPromptTemplate } from "./ai/prompt-loader";
import { recordAttendanceFromCompletionByNguoiDungId } from "./progress-service";

const readingRepository = new ReadingExerciseRepository();
let inMemoryReadingId = 1;

type InMemoryReadingExercise = {
  ExerciseId: number;
  Id: number;
  Title: string;
  Name: string;
  Content: string;
  Level: string;
  Type: string;
  Category: string;
  EstimatedMinutes: number;
  Duration: number;
  SourceType: string;
  CreatedByUserId: number;
  CreatedBy: string;
  Description: string;
  CreatedAt: string;
  DateCreated: string;
  Questions: Array<{
    Id: number;
    QuestionText: string;
    questionText: string;
    question: string;
    Options: string[];
    options: string[];
    correctAnswer: number;
    Explanation: string;
    explanation: string;
  }>;
};

const inMemoryReadingExercises = new Map<number, InMemoryReadingExercise>();

function parseOptionalDateTime(raw?: string): Date | undefined {
  if (!raw) {
    return undefined;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

function toOptionalTimeSpentMinutes(timeSpentSeconds?: number): number | undefined {
  if (!Number.isFinite(timeSpentSeconds)) {
    return undefined;
  }

  if (Number(timeSpentSeconds) <= 0) {
    return undefined;
  }

  return Math.max(1, Math.round(Number(timeSpentSeconds) / 60));
}

type ReadingPartType = "Part 5" | "Part 6" | "Part 7";

function randomOptionIndex(maxInclusive: number): number {
  const safeMax = Math.max(0, Math.trunc(maxInclusive));
  return Math.floor(Math.random() * (safeMax + 1));
}

function normalizePartType(rawType: string | undefined): ReadingPartType {
  const value = String(rawType ?? "").trim().toLowerCase().replace(/\s+/g, "");

  if (value === "part5" || value === "5") {
    return "Part 5";
  }

  if (value === "part6" || value === "6") {
    return "Part 6";
  }

  if (value === "part7" || value === "7") {
    return "Part 7";
  }

  return "Part 7";
}

function getExpectedQuestionCount(partType: ReadingPartType): number {
  if (partType === "Part 5") {
    return 5;
  }

  if (partType === "Part 6") {
    return 6;
  }

  return 8;
}

function extractBlankNumbers(content: string): number[] {
  const matches = [...content.matchAll(/\[(\d+)\]/g)];
  const numbers = new Set<number>();

  for (const match of matches) {
    const value = Number(match[1]);
    if (Number.isInteger(value) && value > 0) {
      numbers.add(value);
    }
  }

  return [...numbers].sort((a, b) => a - b);
}

function extractBlankNumberFromQuestion(questionText: string): number | null {
  const byBracket = questionText.match(/\[(\d+)\]/);
  if (byBracket?.[1]) {
    const value = Number(byBracket[1]);
    if (Number.isInteger(value) && value > 0) {
      return value;
    }
  }

  const byToken = questionText.match(/(?:blank|ch[oỗ]\s*tr[oố]ng)\s*(\d+)/i);
  if (byToken?.[1]) {
    const value = Number(byToken[1]);
    if (Number.isInteger(value) && value > 0) {
      return value;
    }
  }

  return null;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function hasVietnameseDiacritics(text: string): boolean {
  return /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(text);
}

function isLikelyEnglishPassage(text: string): boolean {
  const value = text.trim();
  if (!value) {
    return false;
  }

  if (hasVietnameseDiacritics(value)) {
    return false;
  }

  const wordMatches = value.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
  return wordMatches.length >= 20;
}

async function translatePassageToEnglish(input: {
  provider: AiProvider;
  partType: ReadingPartType;
  content: string;
}): Promise<string | null> {
  try {
    const translated = await generateJsonFromProvider<{ content?: string }>({
      provider: input.provider,
      systemPrompt:
        "You are an expert translator for TOEIC materials. Translate to natural English only.",
      userPrompt: [
        `Part type: ${input.partType}`,
        "Translate the passage to English.",
        "Keep numbered blanks like [1], [2], ... unchanged.",
        "Return ONLY JSON object: {\"content\": \"...\"}",
        `Passage: ${input.content}`,
      ].join("\n"),
      temperature: 0,
    });

    const content = String(translated?.content ?? "").trim();
    if (!content) {
      return null;
    }

    return content;
  } catch {
    return null;
  }
}

function isPart6ShapeValid(content: string, questions: ReadingQuestionInput[], expectedCount: number): boolean {
  if (!isLikelyEnglishPassage(content)) {
    return false;
  }

  if (questions.length !== expectedCount) {
    return false;
  }

  const blankNumbers = extractBlankNumbers(content);
  if (blankNumbers.length < expectedCount) {
    return false;
  }

  const blankSet = new Set<number>(blankNumbers);
  return questions.every((question) => {
    const blankNo = extractBlankNumberFromQuestion(question.questionText);
    return blankNo !== null && blankSet.has(blankNo);
  });
}

function isPart7ShapeValid(content: string, questions: ReadingQuestionInput[], expectedCount: number): boolean {
  if (!isLikelyEnglishPassage(content)) {
    return false;
  }

  if (questions.length !== expectedCount) {
    return false;
  }

  if (extractBlankNumbers(content).length > 0) {
    return false;
  }

  if (countWords(content) < 60) {
    return false;
  }

  return questions.every((question) => extractBlankNumberFromQuestion(question.questionText) === null);
}

function buildPart6FallbackExercise(input: {
  topic: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  questionCount: number;
}): { title: string; content: string; questions: ReadingQuestionInput[] } {
  const topic = input.topic.trim() || "Business Update";
  const title = `Part 6 - ${topic}`;

  const content = [
    `Dear Team,`,
    "",
    `Thank you for your efforts on the ${topic} project. We are [1] to share the latest update with everyone.`,
    "Please [2] the attached schedule before Friday and confirm your assigned tasks.",
    "The client meeting is [3] Monday morning, so all materials must be finalized this week.",
    "If you have any questions, [4] your team leader as soon as possible.",
    "Your feedback is [5] to improve the final presentation.",
    "We appreciate your support and look [6] to a successful launch.",
    "",
    "Best regards,",
    "Project Coordinator",
  ].join("\n");

  const baseQuestions: ReadingQuestionInput[] = [
    {
      questionText: "Blank [1]",
      optionA: "pleased",
      optionB: "please",
      optionC: "pleasing",
      optionD: "pleasant",
      correctAnswer: 0,
      explanation: "Đáp án đúng là A vì sau 'are' cần tính từ để mô tả trạng thái của người viết.",
    },
    {
      questionText: "Blank [2]",
      optionA: "submitting",
      optionB: "submit",
      optionC: "submitted",
      optionD: "submission",
      correctAnswer: 1,
      explanation: "Đáp án đúng là B vì sau 'Please' dùng động từ nguyên mẫu không 'to'.",
    },
    {
      questionText: "Blank [3]",
      optionA: "at",
      optionB: "on",
      optionC: "in",
      optionD: "for",
      correctAnswer: 1,
      explanation: "Đáp án đúng là B vì dùng 'on' với thứ trong tuần (on Monday).",
    },
    {
      questionText: "Blank [4]",
      optionA: "contact",
      optionB: "contacts",
      optionC: "contacting",
      optionD: "contacted",
      correctAnswer: 0,
      explanation: "Đáp án đúng là A vì đây là mệnh lệnh, dùng động từ nguyên mẫu.",
    },
    {
      questionText: "Blank [5]",
      optionA: "valuable",
      optionB: "value",
      optionC: "valuate",
      optionD: "valuably",
      correctAnswer: 0,
      explanation: "Đáp án đúng là A vì sau động từ 'is' cần tính từ mô tả danh từ feedback.",
    },
    {
      questionText: "Blank [6]",
      optionA: "forward",
      optionB: "forwards",
      optionC: "forwarded",
      optionD: "forwarding",
      correctAnswer: 0,
      explanation: "Đáp án đúng là A trong cụm cố định 'look forward to'.",
    },
  ];

  return {
    title,
    content,
    questions: baseQuestions.slice(0, Math.max(1, input.questionCount)),
  };
}

function buildPart7FallbackExercise(input: {
  topic: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  questionCount: number;
}): { title: string; content: string; questions: ReadingQuestionInput[] } {
  const topic = input.topic.trim() || "Business Communication";
  const title = `Part 7 - ${topic}`;

  const content = [
    `Subject: Weekly Update on ${topic}`,
    "",
    "Dear Team,",
    "",
    "Thank you for your continuous support this month. Our department has completed the first phase of the project and prepared a revised timeline for the next tasks.",
    "The final draft of the report must be submitted by Thursday afternoon. On Friday morning, we will hold a short meeting to review key results and assign responsibilities for next week.",
    "If you need additional data, please contact Ms. Lan before Wednesday so she can prepare the materials in time. We also remind everyone to check email updates regularly because the client may request quick changes.",
    "",
    "Best regards,",
    "Project Management Office",
  ].join("\n");

  const baseQuestions: ReadingQuestionInput[] = [
    {
      questionText: "What is the main purpose of this message?",
      optionA: "To announce a holiday schedule",
      optionB: "To provide a weekly project update",
      optionC: "To cancel a client contract",
      optionD: "To introduce a new employee",
      correctAnswer: 1,
      explanation: "Đáp án đúng là B vì toàn bộ email tập trung cập nhật tiến độ và kế hoạch tuần.",
    },
    {
      questionText: "When is the final draft due?",
      optionA: "Wednesday morning",
      optionB: "Thursday afternoon",
      optionC: "Friday afternoon",
      optionD: "Next Monday",
      correctAnswer: 1,
      explanation: "Đáp án đúng là B vì email nêu rõ hạn nộp là Thursday afternoon.",
    },
    {
      questionText: "What will happen on Friday morning?",
      optionA: "A training session",
      optionB: "A client visit",
      optionC: "A short review meeting",
      optionD: "A recruitment interview",
      correctAnswer: 2,
      explanation: "Đáp án đúng là C vì đoạn văn ghi rõ sẽ có cuộc họp ngắn vào Friday morning.",
    },
    {
      questionText: "Who should staff contact for additional data?",
      optionA: "The client",
      optionB: "Ms. Lan",
      optionC: "The HR manager",
      optionD: "The sales team",
      correctAnswer: 1,
      explanation: "Đáp án đúng là B vì email yêu cầu liên hệ Ms. Lan để lấy dữ liệu bổ sung.",
    },
    {
      questionText: "Why are team members asked to check email regularly?",
      optionA: "To receive salary updates",
      optionB: "To download software",
      optionC: "Because client requests may change quickly",
      optionD: "Because meetings are canceled",
      correctAnswer: 2,
      explanation: "Đáp án đúng là C vì đoạn cuối nêu khách hàng có thể yêu cầu thay đổi gấp.",
    },
    {
      questionText: "What can be inferred about the project status?",
      optionA: "It has already finished",
      optionB: "It is moving to the next phase",
      optionC: "It has been postponed indefinitely",
      optionD: "It is not approved yet",
      correctAnswer: 1,
      explanation: "Đáp án đúng là B vì phase đầu đã hoàn tất và đang chuẩn bị nhiệm vụ tiếp theo.",
    },
    {
      questionText: "Which statement is TRUE according to the email?",
      optionA: "The report is due next week",
      optionB: "No meeting is planned",
      optionC: "Materials should be requested before Wednesday",
      optionD: "Only managers attend the Friday meeting",
      correctAnswer: 2,
      explanation: "Đáp án đúng là C vì email yêu cầu xin dữ liệu trước Wednesday.",
    },
    {
      questionText: "Where would this text most likely appear?",
      optionA: "A personal diary",
      optionB: "An internal business email",
      optionC: "A newspaper advertisement",
      optionD: "A travel brochure",
      correctAnswer: 1,
      explanation: "Đáp án đúng là B vì ngữ cảnh và cách viết là email nội bộ công việc.",
    },
  ];

  return {
    title,
    content,
    questions: baseQuestions.slice(0, Math.max(1, input.questionCount)),
  };
}

function enforcePartSpecificShape(input: {
  partType: ReadingPartType;
  topic: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  title: string;
  content: string;
  questions: ReadingQuestionInput[];
  expectedQuestionCount: number;
}): { title: string; content: string; questions: ReadingQuestionInput[] } {
  const title = input.title.trim() || `${input.partType} - ${input.topic}`;
  const content = input.content.trim();
  const questions = input.questions.slice(0, input.expectedQuestionCount);

  if (input.partType === "Part 6") {
    if (isPart6ShapeValid(content, questions, input.expectedQuestionCount)) {
      const normalizedQuestions = questions.map((question, index) => {
        const blankNo = extractBlankNumberFromQuestion(question.questionText) ?? (index + 1);
        return {
          ...question,
          questionText: `Blank [${blankNo}]`,
        };
      });

      return {
        title,
        content,
        questions: normalizedQuestions,
      };
    }

    return buildPart6FallbackExercise({
      topic: input.topic,
      level: input.level,
      questionCount: input.expectedQuestionCount,
    });
  }

  if (input.partType === "Part 7") {
    if (isPart7ShapeValid(content, questions, input.expectedQuestionCount)) {
      return {
        title,
        content,
        questions,
      };
    }

    return buildPart7FallbackExercise({
      topic: input.topic,
      level: input.level,
      questionCount: input.expectedQuestionCount,
    });
  }

  return {
    title,
    content: content || `Read the passage about ${input.topic} and answer the questions.`,
    questions,
  };
}

type ReadingQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
};

type UnknownRecord = Record<string, unknown>;

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

function normalizeExplanationAnswerLabel(explanation: string, correctAnswer: number): string {
  const text = explanation.trim();
  if (!text) {
    return text;
  }

  const expectedLabel = String.fromCharCode(65 + Math.max(0, Math.min(3, correctAnswer)));
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

function parseQuestionsJson(raw: string): ReadingQuestion[] {
  try {
    const data = JSON.parse(raw) as Array<{
      questionText?: string;
      question?: string;
      options?: string[];
      correctAnswer?: number;
      explanation?: string;
      Explanation?: string;
      ExplanationInVietnamese?: string;
      explanationInVietnamese?: string;
    }>;

    return data.map((item) => {
      const options = Array.isArray(item.options) ? item.options : [];
      const numericAnswer = Number(item.correctAnswer ?? 0);
      const boundedAnswer = Number.isFinite(numericAnswer)
        ? Math.max(0, Math.min(Math.max(0, options.length - 1), Math.trunc(numericAnswer)))
        : 0;

      const rawExplanation =
        item.explanation
        ?? item.Explanation
        ?? item.ExplanationInVietnamese
        ?? item.explanationInVietnamese;

      const explanationIndex = rawExplanation
        ? extractAnswerIndexFromExplanation(String(rawExplanation), options.length)
        : null;
      const correctAnswer = typeof explanationIndex === "number" ? explanationIndex : boundedAnswer;

      return {
        question: item.questionText ?? item.question ?? "",
        options,
        correctAnswer,
        ...(rawExplanation
          ? {
              explanation: normalizeExplanationAnswerLabel(String(rawExplanation), correctAnswer),
            }
          : {}),
      };
    });
  } catch {
    return [];
  }
}

function mapExercise(row: Awaited<ReturnType<ReadingExerciseRepository["getById"]>>) {
  if (!row) {
    return null;
  }

  const questions = parseQuestionsJson(row.questionsJson);
  return {
    ExerciseId: row.id,
    Id: row.id,
    Title: row.title,
    Name: row.title,
    Content: row.content,
    Level: row.level,
    Type: row.type,
    Category: row.category,
    EstimatedMinutes: row.estimatedMinutes,
    Duration: row.estimatedMinutes,
    SourceType: row.sourceType,
    CreatedByUserId: row.createdBy,
    CreatedBy: row.createdBy ? String(row.createdBy) : "System",
    Description: row.description,
    CreatedAt: row.createdAt.toISOString(),
    DateCreated: row.createdAt.toISOString(),
    Questions: questions.map((q, idx) => ({
      Id: idx + 1,
      QuestionText: q.question,
      questionText: q.question,
      question: q.question,
      Options: q.options,
      options: q.options,
      correctAnswer: q.correctAnswer,
      Explanation: q.explanation,
      explanation: q.explanation,
    })),
  };
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

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Ignore invalid JSON strings.
      }
    }
  }

  return [];
}

function readObjectFromKeys(record: UnknownRecord | null, keys: string[]): UnknownRecord | null {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const raw = record[key];
    const value = asRecord(raw);
    if (value) {
      return value;
    }

    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw) as unknown;
        const parsedRecord = asRecord(parsed);
        if (parsedRecord) {
          return parsedRecord;
        }
      } catch {
        // Ignore invalid JSON strings.
      }
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

function isPlaceholderOptions(options: string[]): boolean {
  if (options.length !== 4) {
    return false;
  }

  return options.every((option, index) => option.trim().toLowerCase() === `option ${String.fromCharCode(97 + index)}`);
}

function extractEvidenceSentence(content: string, correctOption: string): string {
  const normalizedOption = correctOption.trim().toLowerCase();
  const sentences = content
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  const evidence = sentences.find((sentence) => sentence.toLowerCase().includes(normalizedOption));
  if (evidence) {
    return evidence;
  }

  return sentences[0] ?? "";
}

function buildReadingExplanation(
  questionText: string,
  options: string[],
  correctAnswer: number,
  content: string,
): string {
  const correctOption = options[correctAnswer] ?? "";
  const wrongOption = options.find((_, index) => index !== correctAnswer) ?? "";
  const stem = questionText.replace(/_{2,}/g, "____").trim();
  const completed = stem.includes("____") && correctOption
    ? stem.replace("____", correctOption)
    : stem;
  const evidence = extractEvidenceSentence(content, correctOption);

  return [
    `Đáp án đúng là "${correctOption}" vì câu hoàn chỉnh hợp nghĩa: "${completed}".`,
    evidence ? `Trong bài đọc có chi tiết: "${evidence}".` : "Dựa trên ngữ cảnh chung của bài đọc.",
    "Mẹo: đọc kỹ từ khóa trước và sau chỗ trống để đối chiếu thông tin trong bài.",
  ]
    .filter((part) => part.length > 0)
    .join(" ");
}

function normalizeReadingOptions(rawOptions: unknown[]): string[] {
  const options = rawOptions
    .map((option) => String(option ?? "").trim())
    .filter((option) => option.length > 0)
    .slice(0, 4);

  while (options.length < 4) {
    options.push(`Option ${String.fromCharCode(65 + options.length)}`);
  }

  return options;
}

function resolveOptionIndex(rawValue: unknown, options: string[]): number {
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

function extractReadingQuestions(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) {
    return payload.map((item) => asRecord(item)).filter((item): item is UnknownRecord => Boolean(item));
  }

  const record = asRecord(payload);
  if (!record) {
    return [];
  }

  const candidates = readArrayFromKeys(record, ["questions", "Questions", "items", "Items", "data", "Data"]);
  if (candidates.length > 0) {
    return candidates.map((item) => asRecord(item)).filter((item): item is UnknownRecord => Boolean(item));
  }

  if (record.question || record.Question || record.questionText || record.QuestionText) {
    return [record];
  }

  return [];
}

function buildReadingQuestionInput(
  question: UnknownRecord,
  index: number,
  content: string,
  partType?: ReadingPartType,
): ReadingQuestionInput {
  const arrayOptions = readArrayFromKeys(question, ["options", "Options", "choices", "Choices"]);
  const objectOptions = readObjectFromKeys(question, ["options", "Options", "choices", "Choices", "optionMap", "OptionMap"]);
  const keyedOptions = [
    question.optionA,
    question.optionB,
    question.optionC,
    question.optionD,
    question.OptionA,
    question.OptionB,
    question.OptionC,
    question.OptionD,
  ];

  const rawOptions =
    arrayOptions.length > 0
      ? arrayOptions
      : objectOptions
        ? optionsFromObject(objectOptions)
        : keyedOptions;

  const options = normalizeReadingOptions(rawOptions);
  const correctAnswer = resolveOptionIndex(
    question.correctAnswer
      ?? question.CorrectAnswer
      ?? question.rightOptionIndex
      ?? question.RightOptionIndex
      ?? question.answer
      ?? question.Answer
      ?? question.correctOption
      ?? question.CorrectOption
      ?? question.correct
      ?? question.Correct,
    options,
  );

  const rawQuestionText = readStringFromKeys(question, ["questionText", "QuestionText", "question", "Question"])
    || `Question ${index + 1}`;
  const blankCandidates = extractBlankNumbers(content);
  const blankByQuestion = extractBlankNumberFromQuestion(rawQuestionText);
  const blankFromContent = blankCandidates[index] ?? (index + 1);
  const questionText = partType === "Part 6"
    ? `Blank [${blankByQuestion ?? blankFromContent}]`
    : rawQuestionText;
  const explanationFromAi = readStringFromKeys(
    question,
    ["explanation", "Explanation", "reason", "Reason", "ExplanationInVietnamese", "explanationInVietnamese"],
  );
  const explanationIndex = explanationFromAi
    ? extractAnswerIndexFromExplanation(explanationFromAi, options.length)
    : null;
  const finalCorrectAnswer = typeof explanationIndex === "number" ? explanationIndex : correctAnswer;
  const explanation = explanationFromAi
    ? normalizeExplanationAnswerLabel(explanationFromAi, finalCorrectAnswer)
    : buildReadingExplanation(questionText, options, finalCorrectAnswer, content);
  const optionA = options[0] ?? "Option A";
  const optionB = options[1] ?? "Option B";
  const optionC = options[2] ?? "Option C";
  const optionD = options[3] ?? "Option D";

  if (isPlaceholderOptions([optionA, optionB, optionC, optionD]) && objectOptions) {
    const repaired = normalizeReadingOptions(optionsFromObject(objectOptions));
    const repairedCorrectAnswer = resolveOptionIndex(
      question.correctAnswer
        ?? question.CorrectAnswer
        ?? question.rightOptionIndex
        ?? question.RightOptionIndex
        ?? question.answer
        ?? question.Answer
        ?? question.correctOption
        ?? question.CorrectOption
        ?? question.correct
        ?? question.Correct,
      repaired,
    );

    return {
      questionText,
      optionA: repaired[0] ?? optionA,
      optionB: repaired[1] ?? optionB,
      optionC: repaired[2] ?? optionC,
      optionD: repaired[3] ?? optionD,
      correctAnswer: repairedCorrectAnswer,
      explanation: explanationFromAi
        ? normalizeExplanationAnswerLabel(explanationFromAi, repairedCorrectAnswer)
        : buildReadingExplanation(questionText, repaired, repairedCorrectAnswer, content),
    };
  }

  return {
    questionText,
    optionA,
    optionB,
    optionC,
    optionD,
    correctAnswer: finalCorrectAnswer,
    explanation,
  };
}

export async function listReadingExercises(filters: {
  requestedByTaiKhoanId: number;
  level?: string;
  type?: string;
  sourceType?: string;
}) {
  if (!appConfig.db.enabled) {
    return [...inMemoryReadingExercises.values()].filter((exercise) => {
      const levelMatch = !filters.level || exercise.Level === filters.level;
      const typeMatch = !filters.type || exercise.Type === filters.type;
      const sourceMatch = !filters.sourceType || exercise.SourceType === filters.sourceType;
      return levelMatch && typeMatch && sourceMatch;
    });
  }

  const nguoiDungId = await readingRepository.resolveNguoiDungIdByTaiKhoanId(filters.requestedByTaiKhoanId);
  if (!nguoiDungId) {
    return [];
  }

  const rows = await readingRepository.getAll({
    nguoiDungId,
    ...(filters.level ? { level: filters.level } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
  });
  return rows.map((row) => mapExercise(row));
}

export async function getReadingExerciseById(id: number, requestedByTaiKhoanId: number) {
  if (!appConfig.db.enabled) {
    return inMemoryReadingExercises.get(id) ?? null;
  }

  const nguoiDungId = await readingRepository.resolveNguoiDungIdByTaiKhoanId(requestedByTaiKhoanId);
  if (!nguoiDungId) {
    return null;
  }

  const row = await readingRepository.getById(id, nguoiDungId);
  return mapExercise(row);
}

export async function createReadingPassage(input: {
  requestedByTaiKhoanId: number;
  title: string;
  content: string;
  partType: string;
  level?: string;
  sourceType?: string;
  topic?: string;
  description?: string;
  rawAiPayload?: unknown;
}) {
  const nguoiDungId = await readingRepository.resolveNguoiDungIdByTaiKhoanId(input.requestedByTaiKhoanId);
  if (!nguoiDungId) {
    return null;
  }

  const id = await readingRepository.createPassage({
    title: input.title,
    content: input.content,
    level: input.level ?? "Intermediate",
    partType: input.partType ?? "Part 6",
    nguoiDungId,
    ...(input.sourceType ? { sourceType: input.sourceType } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.topic ? { topic: input.topic } : {}),
    ...(input.rawAiPayload !== undefined ? { rawAiPayload: input.rawAiPayload } : {}),
  });

  return getReadingExerciseById(id, input.requestedByTaiKhoanId);
}

export async function addReadingQuestions(
  exerciseId: number,
  questions: ReadingQuestionInput[],
  requestedByTaiKhoanId: number,
) {
  const nguoiDungId = await readingRepository.resolveNguoiDungIdByTaiKhoanId(requestedByTaiKhoanId);
  if (!nguoiDungId) {
    return null;
  }

  const updated = await readingRepository.setQuestions(exerciseId, nguoiDungId, questions);
  if (!updated) {
    return null;
  }

  return getReadingExerciseById(exerciseId, requestedByTaiKhoanId);
}

export async function createReadingWithAi(input: {
  requestedByTaiKhoanId: number;
  title: string;
  content: string;
  type: string;
  level?: string;
  topic?: string;
  provider?: string;
}) {
  const type = normalizePartType(input.type);
  const level = (input.level || "Intermediate") as "Beginner" | "Intermediate" | "Advanced";

  const generated = await generateAiReading({
    topic: input.topic || input.title || "General",
    level,
    type,
    requestedByTaiKhoanId: input.requestedByTaiKhoanId,
    provider: (input.provider as "gemini" | "openai" | "xai" | undefined) ?? "openai",
  });

  return generated?.Exercise ?? null;
}

export async function generateAiReading(input: {
  topic: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  type: "Part 5" | "Part 6" | "Part 7";
  requestedByTaiKhoanId?: number;
  provider?: "gemini" | "openai" | "xai";
}) {
  const provider = normalizeProvider(input.provider);
  if (!provider) {
    return null;
  }

  const normalizedType = normalizePartType(input.type);

  const expectedQuestionCount = getExpectedQuestionCount(normalizedType);
  const systemPrompt = loadPromptTemplate("reading-ai.system.prompt.txt");
  const partSpecificConstraint = normalizedType === "Part 6"
    ? "PART 6 STRICT: Content must include numbered blanks [1]..[N], and every questionText must explicitly reference its blank number."
    : normalizedType === "Part 7"
      ? "PART 7 STRICT: Content must be a normal passage with NO numbered blanks, and questions must be comprehension/inference questions only."
      : "PART 5 STRICT: Keep sentence-level completion format.";
  const userPrompt = [
    `Topic: ${input.topic}`,
    `Level: ${input.level}`,
    `TOEIC part type: ${normalizedType}`,
    `Question count: ${expectedQuestionCount}`,
    "Passage content MUST be in English.",
    partSpecificConstraint,
    "Randomize correctAnswer across 0/1/2/3. Do not put every answer at index 0.",
    "Return JSON with title, content, and questions.",
  ].join("\n");

  let generated: unknown;
  try {
    generated = await generateJsonFromProvider<unknown>({
      provider,
      systemPrompt,
      userPrompt,
      temperature: 0.6,
    });
  } catch {
    return null;
  }

  const generatedRecord = asRecord(generated);
  const title =
    readStringFromKeys(generatedRecord, ["title", "Title", "name", "Name"]) ||
    `${normalizedType} - ${input.topic}`;
  let content =
    readStringFromKeys(generatedRecord, ["content", "Content", "passage", "Passage", "text", "Text"]) ||
    `Read the passage about ${input.topic} and answer the questions.`;

  if (!isLikelyEnglishPassage(content)) {
    const translated = await translatePassageToEnglish({
      provider,
      partType: normalizedType,
      content,
    });

    if (translated) {
      content = translated;
    }
  }

  const rawQuestions = extractReadingQuestions(generated);

  const aiQuestions: ReadingQuestionInput[] = rawQuestions
    .slice(0, expectedQuestionCount)
    .map((question, index) => buildReadingQuestionInput(question, index, content, normalizedType));

  if (aiQuestions.length < expectedQuestionCount) {
    for (let i = aiQuestions.length; i < expectedQuestionCount; i += 1) {
      const fallbackCorrectAnswer = randomOptionIndex(3);
      aiQuestions.push({
        questionText: normalizedType === "Part 6"
          ? `Blank [${i + 1}]`
          : `Question ${i + 1}: What is the best answer according to the passage?`,
        optionA: "Option A",
        optionB: "Option B",
        optionC: "Option C",
        optionD: "Option D",
        correctAnswer: fallbackCorrectAnswer,
        explanation: "Dựa vào thông tin trong bài đọc để chọn đáp án đúng nhất.",
      });
    }
  }

  const partSafeExercise = enforcePartSpecificShape({
    partType: normalizedType,
    topic: input.topic,
    level: input.level,
    title,
    content,
    questions: aiQuestions.slice(0, expectedQuestionCount),
    expectedQuestionCount,
  });

  if (!appConfig.db.enabled) {
    const now = new Date().toISOString();
    const id = inMemoryReadingId++;
    const questions = partSafeExercise.questions.map((q, idx) => ({
      Id: idx + 1,
      QuestionText: q.questionText,
      questionText: q.questionText,
      question: q.questionText,
      Options: [q.optionA, q.optionB, q.optionC, q.optionD],
      options: [q.optionA, q.optionB, q.optionC, q.optionD],
      correctAnswer: q.correctAnswer,
      Explanation: q.explanation ?? "",
      explanation: q.explanation ?? "",
    }));

    const duration = normalizedType === "Part 5" ? 10 : normalizedType === "Part 6" ? 15 : 20;
    const exercise: InMemoryReadingExercise = {
      ExerciseId: id,
      Id: id,
      Title: partSafeExercise.title,
      Name: partSafeExercise.title,
      Content: partSafeExercise.content,
      Level: input.level,
      Type: normalizedType,
      Category: input.topic,
      EstimatedMinutes: duration,
      Duration: duration,
      SourceType: "ai",
      CreatedByUserId: 1,
      CreatedBy: "AI",
      Description: "Generated in no-db mode",
      CreatedAt: now,
      DateCreated: now,
      Questions: questions,
    };

    inMemoryReadingExercises.set(id, exercise);

    return {
      Success: true,
      Message: `Generated with ${provider} (no-db mode)`,
      Exercise: exercise,
    };
  }

  const created = await createReadingPassage({
    requestedByTaiKhoanId: Number(input.requestedByTaiKhoanId ?? 0),
    title,
    content,
    partType: normalizedType,
    level: input.level,
    sourceType: "ai",
    topic: input.topic,
    description: `Generated with ${provider}`,
    rawAiPayload: generated,
  });

  if (!created) {
    return null;
  }

  await addReadingQuestions(
    created.ExerciseId,
    partSafeExercise.questions,
    Number(input.requestedByTaiKhoanId ?? 0),
  );
  const exercise = await getReadingExerciseById(
    created.ExerciseId,
    Number(input.requestedByTaiKhoanId ?? 0),
  );
  if (!exercise) {
    return null;
  }

  return {
    Success: true,
    Message: `Generated with ${provider}`,
    Exercise: exercise,
  };
}

export async function submitReadingResult(input: {
  requestedByTaiKhoanId: number;
  exerciseId: number;
  answers: number[];
  startedAt?: string;
  completedAt?: string;
  timeSpentSeconds?: number;
}) {
  if (!appConfig.db.enabled) {
    const exercise = inMemoryReadingExercises.get(input.exerciseId);
    if (!exercise) {
      return { success: false, message: "Exercise not found" };
    }

    const totalQuestions = exercise.Questions.length;
    let correctAnswers = 0;

    for (let i = 0; i < totalQuestions; i += 1) {
      if ((input.answers?.[i] ?? -1) === exercise.Questions[i]?.correctAnswer) {
        correctAnswers += 1;
      }
    }

    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 10000) / 100 : 0;
    return {
      success: true,
      score,
      totalQuestions,
      correctAnswers,
    };
  }

  const nguoiDungId = await readingRepository.resolveNguoiDungIdByTaiKhoanId(input.requestedByTaiKhoanId);
  if (!nguoiDungId) {
    return { success: false, message: "User not found" };
  }

  const exercise =
    (await readingRepository.getById(input.exerciseId, nguoiDungId))
    ?? (await readingRepository.getByIdAnyUser(input.exerciseId));
  if (!exercise) {
    return { success: false, message: "Exercise not found" };
  }

  const questions = parseQuestionsJson(exercise.questionsJson);
  const totalQuestions = questions.length;
  let correctAnswers = 0;

  for (let i = 0; i < totalQuestions; i += 1) {
    if ((input.answers?.[i] ?? -1) === questions[i]?.correctAnswer) {
      correctAnswers += 1;
    }
  }

  const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 10000) / 100 : 0;

  const completedAt = (() => {
    const completedAtRaw = input.completedAt ? new Date(input.completedAt) : new Date();
    return Number.isNaN(completedAtRaw.getTime()) ? new Date() : completedAtRaw;
  })();
  const startedAt = parseOptionalDateTime(input.startedAt);
  const timeSpentMinutes = toOptionalTimeSpentMinutes(input.timeSpentSeconds);

  const completion = await readingRepository.addCompletion({
    nguoiDungId,
    exerciseId: input.exerciseId,
    answers: input.answers,
    questionDetails: questions.map((question) => ({
      questionText: question.question,
      options: question.options,
      correctAnswerIndex: question.correctAnswer,
      ...(question.explanation ? { explanation: question.explanation } : {}),
    })),
    score,
    totalQuestions,
    correctAnswers,
    ...(startedAt ? { startedAt } : {}),
    completedAt,
    ...(typeof timeSpentMinutes === "number" ? { timeSpentMinutes } : {}),
  });

  await recordAttendanceFromCompletionByNguoiDungId({
    nguoiDungId,
    completedAt,
  });

  triggerLearningInsightsRefresh({
    nguoiDungId,
    attemptNumber: completion.attemptNumber,
    source: "reading_submit",
  });

  return {
    success: true,
    score,
    totalQuestions,
    correctAnswers,
  };
}

export async function updateReadingExercise(
  id: number,
  requestedByTaiKhoanId: number,
  input: { title: string; content: string; level: string; type: string; description?: string },
) {
  const nguoiDungId = await readingRepository.resolveNguoiDungIdByTaiKhoanId(requestedByTaiKhoanId);
  if (!nguoiDungId) {
    return false;
  }

  return readingRepository.updateExercise(id, nguoiDungId, input);
}

export async function deleteReadingExercise(id: number, requestedByTaiKhoanId: number) {
  const nguoiDungId = await readingRepository.resolveNguoiDungIdByTaiKhoanId(requestedByTaiKhoanId);
  if (!nguoiDungId) {
    return false;
  }

  return readingRepository.remove(id, nguoiDungId);
}
