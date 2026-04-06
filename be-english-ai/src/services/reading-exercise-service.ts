import { ReadingExerciseRepository, type ReadingQuestionInput } from "../database/repositories/reading-exercise-repository";
import { appConfig } from "../config";
import { generateJsonFromProvider, type AiProvider } from "./ai/ai-client";
import { loadPromptTemplate } from "./ai/prompt-loader";

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

type ReadingQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
};

type UnknownRecord = Record<string, unknown>;

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

    return data.map((item) => ({
      question: item.questionText ?? item.question ?? "",
      options: Array.isArray(item.options) ? item.options : [],
      correctAnswer: Number(item.correctAnswer ?? 0),
      ...((item.explanation
        ?? item.Explanation
        ?? item.ExplanationInVietnamese
        ?? item.explanationInVietnamese)
        ? {
            explanation:
              item.explanation
              ?? item.Explanation
              ?? item.ExplanationInVietnamese
              ?? item.explanationInVietnamese,
          }
        : {}),
    }));
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

  const questionText = readStringFromKeys(question, ["questionText", "QuestionText", "question", "Question"])
    || `Question ${index + 1}`;
  const explanationFromAi = readStringFromKeys(
    question,
    ["explanation", "Explanation", "reason", "Reason", "ExplanationInVietnamese", "explanationInVietnamese"],
  );
  const explanation = explanationFromAi || buildReadingExplanation(questionText, options, correctAnswer, content);
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
      explanation: explanationFromAi || buildReadingExplanation(questionText, repaired, repairedCorrectAnswer, content),
    };
  }

  return {
    questionText,
    optionA,
    optionB,
    optionC,
    optionD,
    correctAnswer,
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
  const type = (input.type || "Part 7") as "Part 5" | "Part 6" | "Part 7";
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

  const expectedQuestionCount = input.type === "Part 5" ? 5 : input.type === "Part 6" ? 6 : 8;
  const systemPrompt = loadPromptTemplate("reading-ai.system.prompt.txt");
  const userPrompt = [
    `Topic: ${input.topic}`,
    `Level: ${input.level}`,
    `TOEIC part type: ${input.type}`,
    `Question count: ${expectedQuestionCount}`,
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
    `${input.type} - ${input.topic}`;
  const content =
    readStringFromKeys(generatedRecord, ["content", "Content", "passage", "Passage", "text", "Text"]) ||
    `Read the passage about ${input.topic} and answer the questions.`;
  const rawQuestions = extractReadingQuestions(generated);

  const aiQuestions: ReadingQuestionInput[] = rawQuestions
    .slice(0, expectedQuestionCount)
    .map((question, index) => buildReadingQuestionInput(question, index, content));

  if (aiQuestions.length === 0) {
    return null;
  }

  if (aiQuestions.length < expectedQuestionCount) {
    for (let i = aiQuestions.length; i < expectedQuestionCount; i += 1) {
      aiQuestions.push({
        questionText: `Question ${i + 1}: What is the best answer according to the passage?`,
        optionA: "Option A",
        optionB: "Option B",
        optionC: "Option C",
        optionD: "Option D",
        correctAnswer: 0,
        explanation: "Dựa vào thông tin trong bài đọc để chọn đáp án đúng nhất.",
      });
    }
  }

  if (!appConfig.db.enabled) {
    const now = new Date().toISOString();
    const id = inMemoryReadingId++;
    const questions = aiQuestions.map((q, idx) => ({
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

    const duration = input.type === "Part 5" ? 10 : input.type === "Part 6" ? 15 : 20;
    const exercise: InMemoryReadingExercise = {
      ExerciseId: id,
      Id: id,
      Title: title,
      Name: title,
      Content: content,
      Level: input.level,
      Type: input.type,
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
    partType: input.type,
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
    aiQuestions,
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
  completedAt?: string;
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

  const exercise = await readingRepository.getById(input.exerciseId, nguoiDungId);
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

  await readingRepository.addCompletion({
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
    completedAt: input.completedAt ? new Date(input.completedAt) : new Date(),
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
