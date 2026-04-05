import { randomUUID } from "node:crypto";
import { generateJsonFromProvider, type AiProvider } from "./ai/ai-client";
import { loadPromptTemplate } from "./ai/prompt-loader";
import { appConfig } from "../config";
import { exerciseRepository } from "../database/repositories/exercise-repository";
import { logger } from "../utils/logger";

type ListeningQuestion = {
  Question: string;
  Options: string[];
  RightOptionIndex: number;
  ExplanationInVietnamese: string;
};

type ListeningQuestionAiPayload = {
  question?: string;
  options?: string[];
  correctAnswerIndex?: number;
  explanationInVietnamese?: string;
};

type ListeningAiPayload = {
  title?: string;
  transcript?: string;
  questions?: ListeningQuestionAiPayload[];
};

type StoredListeningQuestionPayload = {
  Question?: string;
  question?: string;
  Options?: string[];
  options?: string[];
  RightOptionIndex?: number;
  rightOptionIndex?: number;
  ExplanationInVietnamese?: string;
  explanationInVietnamese?: string;
};

type StoredListeningPayload = {
  title?: string;
  topic?: string;
  transcript?: string;
  questions?: StoredListeningQuestionPayload[];
  englishLevel?: number;
  genre?: string;
  totalQuestions?: number;
  audioContent?: string | null;
  audioFilePath?: string | null;
  createdAt?: string;
  expiresAt?: string;
};

const MIN_TRANSCRIPT_WORDS = 160;
const MAX_TRANSCRIPT_WORDS = 320;
const MAX_AI_PARSE_ATTEMPTS = 3;

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

function normalizeListeningAiPayload(payload: ListeningAiPayload | unknown): {
  title: string;
  transcript: string;
  questions: unknown[];
} {
  const root = asRecord(payload);
  if (!root) {
    return { title: "", transcript: "", questions: [] };
  }

  const contentRoot = asRecord(root.data) ?? asRecord(root.result) ?? root;

  const title = readFirstString(contentRoot, ["title", "Title"]);
  const transcript = readFirstString(contentRoot, [
    "transcript",
    "Transcript",
    "passage",
    "Passage",
    "script",
    "Script",
    "content",
    "Content",
  ]);
  const questions = readFirstArray(contentRoot, ["questions", "Questions", "items", "Items", "quiz", "Quiz"]);

  return { title, transcript, questions };
}

function resolveCorrectAnswerIndex(record: Record<string, unknown>, options: string[]): number {
  const directIndexKeys = ["correctAnswerIndex", "correctOptionIndex", "rightOptionIndex", "answerIndex", "CorrectAnswerIndex"];
  for (const key of directIndexKeys) {
    const num = Number(record[key]);
    if (Number.isInteger(num)) {
      if (num >= 1 && num <= options.length) {
        return num - 1;
      }
      return Math.max(0, Math.min(3, num));
    }
  }

  const answerToken = String(
    record.correctAnswer ??
      record.CorrectAnswer ??
      record.answer ??
      record.Answer ??
      "",
  )
    .trim()
    .toUpperCase();

  if (/^[A-D]$/.test(answerToken)) {
    return answerToken.charCodeAt(0) - 65;
  }

  if (answerToken.length > 0) {
    const indexByOptionText = options.findIndex((option) => option.trim().toUpperCase() === answerToken);
    if (indexByOptionText >= 0) {
      return indexByOptionText;
    }
  }

  return 0;
}

function normalizeEnglishLevel(level: number): number {
  if (!Number.isInteger(level)) {
    return 1;
  }

  return Math.max(1, Math.min(6, level));
}

function mapEnglishLevelToCefr(level: number): string {
  const normalized = normalizeEnglishLevel(level);
  switch (normalized) {
    case 1:
      return "A1";
    case 2:
      return "A2";
    case 3:
      return "B1";
    case 4:
      return "B2";
    case 5:
      return "C1";
    case 6:
      return "C2";
    default:
      return "A1";
  }
}

function buildFallbackAudioUrl(transcript: string): string | null {
  const normalized = transcript.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  const preview = normalized.slice(0, 200);
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(preview)}`;
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function isTemplateTranscript(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return /today\s+you\s+will\s+hear|first,\s+they\s+introduce\s+the\s+situation|summarize\s+the\s+main\s+takeaway/.test(normalized);
}

function buildListeningUserPrompt(input: {
  topic: string;
  genreLabel: string;
  levelLabel: string;
  totalQuestions: number;
  previousIssues?: string[];
}): string {
  const parts = [
    `Topic: ${input.topic}`,
    `Genre: ${input.genreLabel}`,
    `English level: ${input.levelLabel}`,
    `Question count: ${input.totalQuestions}`,
    `Transcript length: ${MIN_TRANSCRIPT_WORDS}-${MAX_TRANSCRIPT_WORDS} words`,
    "Transcript MUST be a real listening passage with concrete details (names, places, times, numbers, events).",
    "Do NOT output template/meta text like 'Today you will hear...' or step-by-step placeholders.",
    "Each explanationInVietnamese must cite why the correct option is correct from transcript content and briefly why other options are wrong.",
    "Return strict JSON only.",
  ];

  if (input.previousIssues && input.previousIssues.length > 0) {
    parts.push(`Previous output was invalid. Fix these issues exactly: ${input.previousIssues.join("; ")}.`);
  }

  return parts.join("\n");
}

function isGenericExplanation(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return /giai\s*thich\s*cho\s*cau\s*hoi|explanation\s*for\s*question|dap\s*an\s*[a-d]\s*phu\s*hop\s*nhat/.test(normalized);
}

function pickEvidenceSentence(transcript: string, optionText: string): string {
  const sentences = transcript
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (sentences.length === 0) {
    return "";
  }

  const optionTokens = optionText
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);

  if (optionTokens.length === 0) {
    return sentences[0] ?? "";
  }

  let bestSentence = "";
  let bestScore = -1;
  for (const sentence of sentences) {
    const sentenceLower = sentence.toLowerCase();
    const score = optionTokens.reduce((sum, token) => (sentenceLower.includes(token) ? sum + 1 : sum), 0);
    if (score > bestScore) {
      bestScore = score;
      bestSentence = sentence;
    }
  }

  if (bestScore <= 0) {
    return sentences[0] ?? "";
  }

  return bestSentence;
}

function buildDetailedExplanation(question: ListeningQuestion, transcript: string): string {
  const correctIndex = Math.max(0, Math.min(question.Options.length - 1, question.RightOptionIndex));
  const correctOption = question.Options[correctIndex] ?? "";
  const correctLabel = String.fromCharCode(65 + correctIndex);
  const evidence = pickEvidenceSentence(transcript, correctOption);

  const base = `Dap an dung la ${correctLabel}: ${correctOption}.`;
  if (evidence) {
    return `${base} Can cu tu transcript: "${evidence}". Cac lua chon con lai khong trung voi thong tin duoc de cap.`;
  }

  return `${base} Noi dung transcript ung ho y nay, trong khi cac dap an con lai khong phu hop ngu canh bai nghe.`;
}

function ensureQuestionExplanations(questions: ListeningQuestion[], transcript: string): ListeningQuestion[] {
  return questions.map((question) => {
    if (!isGenericExplanation(question.ExplanationInVietnamese)) {
      return question;
    }

    return {
      ...question,
      ExplanationInVietnamese: buildDetailedExplanation(question, transcript),
    };
  });
}

type ListeningExercise = {
  ExerciseId: string;
  Title: string;
  Genre: string;
  EnglishLevel: number;
  Transcript: string;
  AudioContent?: string;
  Questions: ListeningQuestion[];
  CreatedAt: string;
  ExpiresAt: string;
};

const CACHE_MS = 45 * 60 * 1000;
const exercises = new Map<string, ListeningExercise>();

const genreMap: Record<number, string> = {
  1: "Daily Conversation",
  2: "News Report",
  3: "Storytelling",
  4: "Academic Lecture",
  5: "Business Meeting",
};

const englishLevelMap: Record<number, string> = {
  1: "A1 - Beginner",
  2: "A2 - Elementary",
  3: "B1 - Intermediate",
  4: "B2 - Upper Intermediate",
  5: "C1 - Advanced",
  6: "C2 - Proficient",
};

const aiModelProviderMap: Record<number, AiProvider> = {
  0: "gemini",
  1: "openai",
  2: "xai",
};

export function getListeningGenres() {
  return genreMap;
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeStoredListeningQuestion(raw: unknown): ListeningQuestion | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }

  const question = readFirstString(record, ["Question", "question", "text", "Text"]);
  if (!question) {
    return null;
  }

  const rawOptions = readFirstArray(record, ["Options", "options", "choices", "Choices"]);
  const options = rawOptions
    .map((option) => String(option ?? "").trim())
    .filter((option) => option.length > 0)
    .slice(0, 4);

  if (options.length < 2) {
    return null;
  }

  while (options.length < 4) {
    options.push(`Option ${String.fromCharCode(65 + options.length)}`);
  }

  const rightOptionIndex = resolveCorrectAnswerIndex(record, options);
  const explanation =
    readFirstString(record, [
      "ExplanationInVietnamese",
      "explanationInVietnamese",
      "Explanation",
      "explanation",
    ]) || "";

  return {
    Question: question,
    Options: options,
    RightOptionIndex: rightOptionIndex,
    ExplanationInVietnamese: explanation,
  };
}

function parseStoredListeningExercise(exerciseId: string, rawPayload: string): ListeningExercise | null {
  const payload = parseJson<StoredListeningPayload>(rawPayload);
  if (!payload) {
    return null;
  }

  const questions = (Array.isArray(payload.questions) ? payload.questions : [])
    .map((question) => normalizeStoredListeningQuestion(question))
    .filter((question): question is ListeningQuestion => Boolean(question));

  if (questions.length === 0) {
    return null;
  }

  const createdAt = payload.createdAt && !Number.isNaN(Date.parse(payload.createdAt))
    ? payload.createdAt
    : new Date().toISOString();
  const expiresAt = payload.expiresAt && !Number.isNaN(Date.parse(payload.expiresAt))
    ? payload.expiresAt
    : new Date(new Date(createdAt).getTime() + CACHE_MS).toISOString();

  return {
    ExerciseId: exerciseId,
    Title: String(payload.title ?? "Listening practice"),
    Genre: String(payload.genre ?? "General"),
    EnglishLevel: normalizeEnglishLevel(Number(payload.englishLevel ?? 1)),
    Transcript: String(payload.transcript ?? ""),
    ...(payload.audioContent ? { AudioContent: String(payload.audioContent) } : {}),
    Questions: ensureQuestionExplanations(questions, String(payload.transcript ?? "")),
    CreatedAt: createdAt,
    ExpiresAt: expiresAt,
  };
}

function resolveProvider(aiModel: number | undefined): AiProvider {
  const parsed = Number(aiModel);
  if (Number.isInteger(parsed) && aiModelProviderMap[parsed]) {
    return aiModelProviderMap[parsed] as AiProvider;
  }

  return "openai";
}

function normalizeAiQuestion(raw: ListeningQuestionAiPayload | unknown, questionIndex: number): ListeningQuestion | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }

  const questionText = readFirstString(record, ["question", "Question", "text", "Text", "content", "Content"]);
  if (!questionText) {
    return null;
  }

  const rawOptions = readFirstArray(record, ["options", "Options", "choices", "Choices", "answers", "Answers"]);
  const options = rawOptions.map((opt) => String(opt ?? "").trim()).filter((opt) => opt.length > 0).slice(0, 4);

  if (options.length < 2) {
    return null;
  }

  while (options.length < 4) {
    options.push(`Option ${String.fromCharCode(65 + options.length)}`);
  }

  const correctIndex = resolveCorrectAnswerIndex(record, options);

  const explanation =
    readFirstString(record, [
      "explanationInVietnamese",
      "ExplanationInVietnamese",
      "explanation",
      "Explanation",
      "reason",
      "Reason",
    ]) || "";

  return {
    Question: questionText,
    Options: options,
    RightOptionIndex: correctIndex,
    ExplanationInVietnamese: explanation,
  };
}

async function generateListeningFromAi(input: {
  Genre: number;
  EnglishLevel: number;
  TotalQuestions: number;
  CustomTopic?: string;
  AiModel?: number;
}): Promise<Pick<ListeningExercise, "Title" | "Transcript" | "Questions">> {
  const provider = resolveProvider(input.AiModel);
  const topic = input.CustomTopic?.trim() || "General listening topic";
  const genreLabel = getGenreLabel(input.Genre);
  const levelLabel = englishLevelMap[input.EnglishLevel] ?? `Level ${input.EnglishLevel}`;
  const totalQuestions = Math.min(15, Math.max(1, Number(input.TotalQuestions) || 5));

  const systemPrompt = loadPromptTemplate("listening-ai.system.prompt.txt");
  let previousIssues: string[] = [];

  for (let attempt = 1; attempt <= MAX_AI_PARSE_ATTEMPTS; attempt += 1) {
    const userPrompt = buildListeningUserPrompt({
      topic,
      genreLabel,
      levelLabel,
      totalQuestions,
      ...(previousIssues.length > 0 ? { previousIssues } : {}),
    });

    const generated = await generateJsonFromProvider<ListeningAiPayload>({
      provider,
      systemPrompt,
      userPrompt,
      temperature: 0.55,
    });

    const normalizedPayload = normalizeListeningAiPayload(generated);
    const transcript = normalizedPayload.transcript;
    const transcriptWords = countWords(transcript);

    const rawQuestions = normalizedPayload.questions;
    const normalizedQuestions = rawQuestions
      .slice(0, totalQuestions)
      .map((question, index) => normalizeAiQuestion(question, index))
      .filter((question): question is ListeningQuestion => Boolean(question));

    const issues: string[] = [];
    if (!transcript) {
      issues.push("Missing transcript");
    } else {
      if (isTemplateTranscript(transcript)) {
        issues.push("Transcript looks like template text, not a real passage");
      }
      if (transcriptWords < MIN_TRANSCRIPT_WORDS || transcriptWords > MAX_TRANSCRIPT_WORDS) {
        issues.push(`Transcript length must be ${MIN_TRANSCRIPT_WORDS}-${MAX_TRANSCRIPT_WORDS} words`);
      }
    }

    if (normalizedQuestions.length !== totalQuestions) {
      issues.push(`Need ${totalQuestions} valid questions with 4 options each and valid correctAnswerIndex`);
    }

    if (issues.length === 0) {
      const title = normalizedPayload.title || `Listening practice - ${genreLabel}`;
      const explainedQuestions = ensureQuestionExplanations(normalizedQuestions, transcript);

      return {
        Title: title,
        Transcript: transcript,
        Questions: explainedQuestions,
      };
    }

    logger.warn("Listening AI payload validation failed", {
      provider,
      attempt,
      maxAttempts: MAX_AI_PARSE_ATTEMPTS,
      issues,
      transcriptWords,
      validQuestions: normalizedQuestions.length,
      requestedQuestions: totalQuestions,
    });

    previousIssues = issues;
  }

  throw new Error("Listening AI returned invalid format after retries. Please generate again.");
}

function getGenreLabel(genre: number): string {
  return genreMap[genre] ?? "General";
}

export async function generateListeningExercise(input: {
  requestedByTaiKhoanId: number;
  Genre: number;
  EnglishLevel: number;
  TotalQuestions: number;
  CustomTopic?: string;
  AiModel?: number;
}) {
  const totalQuestions = Math.min(15, Math.max(1, Number(input.TotalQuestions) || 5));
  const temporaryExerciseId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_MS);
  const genreLabel = getGenreLabel(input.Genre);
  const englishLevel = normalizeEnglishLevel(Number(input.EnglishLevel));
  const generated = await generateListeningFromAi({ ...input, TotalQuestions: totalQuestions });
  const audioContent = buildFallbackAudioUrl(generated.Transcript);

  const exercise: ListeningExercise = {
    ExerciseId: temporaryExerciseId,
    Title: generated.Title,
    Genre: genreLabel,
    EnglishLevel: englishLevel,
    Transcript: generated.Transcript,
    ...(audioContent ? { AudioContent: audioContent } : {}),
    Questions: generated.Questions,
    CreatedAt: now.toISOString(),
    ExpiresAt: expiresAt.toISOString(),
  };

  if (appConfig.db.enabled) {
    const exerciseId = await exerciseRepository.saveListening({
      requestedByTaiKhoanId: input.requestedByTaiKhoanId,
      title: exercise.Title,
      topic: input.CustomTopic?.trim() || genreLabel,
      transcript: exercise.Transcript,
      questionsJson: JSON.stringify(exercise.Questions),
      englishLevel,
      cefrLevel: mapEnglishLevelToCefr(englishLevel),
      genre: genreLabel,
      totalQuestions: exercise.Questions.length,
      audioContent: exercise.AudioContent ?? null,
      audioFilePath: null,
      createdAt: now,
      expiresAt,
    });

    if (!exerciseId) {
      throw new Error("Unable to save listening exercise");
    }

    exercise.ExerciseId = String(exerciseId);
  }

  exercises.set(exercise.ExerciseId, exercise);
  return exercise;
}

export async function gradeListeningExercise(input: {
  requestedByTaiKhoanId: number;
  ExerciseId: string;
  Answers: Array<{ QuestionIndex: number; SelectedOptionIndex: number }>;
}) {
  let exercise = exercises.get(input.ExerciseId) ?? null;

  if (exercise && new Date(exercise.ExpiresAt).getTime() < Date.now()) {
    exercises.delete(input.ExerciseId);
    exercise = null;
  }

  const parsedExerciseId = Number(input.ExerciseId);
  let nguoiDungId: number | null = null;

  if (!exercise && appConfig.db.enabled && Number.isInteger(parsedExerciseId) && parsedExerciseId > 0) {
    nguoiDungId = await exerciseRepository.resolveNguoiDungIdByTaiKhoanId(input.requestedByTaiKhoanId);
    if (!nguoiDungId) {
      return null;
    }

    const stored = await exerciseRepository.getExerciseById(parsedExerciseId, nguoiDungId);
    if (!stored || stored.kieuBaiTap !== "listening") {
      return null;
    }

    exercise = parseStoredListeningExercise(String(parsedExerciseId), stored.noiDungJson);
    if (!exercise) {
      return null;
    }

    exercises.set(exercise.ExerciseId, exercise);
  }

  if (!exercise) {
    return null;
  }

  const answerMap = new Map<number, number>();
  for (const answer of input.Answers ?? []) {
    answerMap.set(answer.QuestionIndex, answer.SelectedOptionIndex);
  }

  const feedback = exercise.Questions.map((q, idx) => {
    const selected = answerMap.get(idx);
    const isCorrect = selected === q.RightOptionIndex;

    return {
      QuestionIndex: idx,
      Question: q.Question,
      Options: q.Options,
      SelectedOptionIndex: selected ?? null,
      RightOptionIndex: q.RightOptionIndex,
      ExplanationInVietnamese: q.ExplanationInVietnamese,
      IsCorrect: isCorrect,
    };
  });

  const correctAnswers = feedback.filter((x) => x.IsCorrect).length;
  const score = feedback.length > 0 ? Math.round((correctAnswers / feedback.length) * 10000) / 100 : 0;

  const response = {
    ExerciseId: exercise.ExerciseId,
    Title: exercise.Title,
    Transcript: exercise.Transcript,
    AudioContent: exercise.AudioContent,
    TotalQuestions: feedback.length,
    CorrectAnswers: correctAnswers,
    Score: score,
    Questions: feedback,
  };

  if (appConfig.db.enabled && Number.isInteger(parsedExerciseId) && parsedExerciseId > 0) {
    const effectiveNguoiDungId =
      nguoiDungId ?? (await exerciseRepository.resolveNguoiDungIdByTaiKhoanId(input.requestedByTaiKhoanId));

    if (effectiveNguoiDungId) {
      const stored = await exerciseRepository.getExerciseById(parsedExerciseId, effectiveNguoiDungId);
      if (stored && stored.kieuBaiTap === "listening") {
        const details = feedback.map((item, index) => ({
          questionOrder: index + 1,
          questionType: "listening",
          userAnswer:
            typeof item.SelectedOptionIndex === "number" && item.SelectedOptionIndex >= 0
              ? String(item.Options[item.SelectedOptionIndex] ?? "")
              : null,
          correctAnswer: String(item.Options[item.RightOptionIndex] ?? ""),
          isCorrect: item.IsCorrect,
          scorePerQuestion:
            feedback.length > 0 && item.IsCorrect
              ? Math.round((10000 / feedback.length)) / 100
              : 0,
          note: item.ExplanationInVietnamese,
        }));

        const completedAt = new Date();
        const incorrectAnswers = Math.max(0, feedback.length - correctAnswers);

        await exerciseRepository.addCompletion({
          nguoiDungId: effectiveNguoiDungId,
          exerciseId: parsedExerciseId,
          answersJson: {
            answers: input.Answers,
          },
          resultJson: {
            totalQuestions: feedback.length,
            correctAnswers,
            incorrectAnswers,
            score,
            submittedAt: completedAt.toISOString(),
          },
          score,
          totalQuestions: feedback.length,
          correctAnswers,
          completedAt,
          details,
        });
      }
    }
  }

  return response;
}

export async function getRecentListeningExercises(requestedByTaiKhoanId: number, take?: number) {
  const limit = Math.min(50, Math.max(1, take ?? 20));

  if (appConfig.db.enabled) {
    const nguoiDungId = await exerciseRepository.resolveNguoiDungIdByTaiKhoanId(requestedByTaiKhoanId);
    if (!nguoiDungId) {
      return [];
    }

    const rows = await exerciseRepository.listRecentListeningExercises(nguoiDungId, limit);
    const nowMs = Date.now();

    return rows
      .map((row) => {
        const payload = parseJson<StoredListeningPayload>(row.noiDungJson);
        const createdAt = payload?.createdAt && !Number.isNaN(Date.parse(payload.createdAt))
          ? payload.createdAt
          : row.createdAt.toISOString();
        const expiresAt = payload?.expiresAt && !Number.isNaN(Date.parse(payload.expiresAt))
          ? payload.expiresAt
          : new Date(new Date(createdAt).getTime() + CACHE_MS).toISOString();

        return {
          ExerciseId: String(row.exerciseId),
          Title: String(payload?.title ?? `Listening practice ${row.exerciseId}`),
          Genre: String(payload?.genre ?? "General"),
          EnglishLevel: normalizeEnglishLevel(Number(payload?.englishLevel ?? 1)),
          TotalQuestions: Array.isArray(payload?.questions) ? payload.questions.length : 0,
          CreatedAt: createdAt,
          ExpiresAt: expiresAt,
        };
      })
      .filter((item) => new Date(item.ExpiresAt).getTime() >= nowMs)
      .slice(0, limit);
  }

  const nowMs = Date.now();

  return [...exercises.values()]
    .filter((x) => new Date(x.ExpiresAt).getTime() >= nowMs)
    .sort((a, b) => b.CreatedAt.localeCompare(a.CreatedAt))
    .slice(0, limit)
    .map((x) => ({
      ExerciseId: x.ExerciseId,
      Title: x.Title,
      Genre: x.Genre,
      EnglishLevel: x.EnglishLevel,
      TotalQuestions: x.Questions.length,
      CreatedAt: x.CreatedAt,
      ExpiresAt: x.ExpiresAt,
    }));
}
