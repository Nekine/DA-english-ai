import { randomUUID } from "node:crypto";
import { generateJsonFromProvider, type AiProvider } from "./ai/ai-client";
import { loadPromptTemplate } from "./ai/prompt-loader";

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

function resolveProvider(aiModel: number | undefined): AiProvider {
  const parsed = Number(aiModel);
  if (Number.isInteger(parsed) && aiModelProviderMap[parsed]) {
    return aiModelProviderMap[parsed] as AiProvider;
  }

  return "openai";
}

function normalizeAiQuestion(raw: ListeningQuestionAiPayload, questionIndex: number): ListeningQuestion | null {
  const questionText = String(raw.question ?? "").trim();
  if (!questionText) {
    return null;
  }

  const options = Array.isArray(raw.options)
    ? raw.options.map((opt) => String(opt ?? "").trim()).filter((opt) => opt.length > 0).slice(0, 4)
    : [];

  if (options.length < 2) {
    return null;
  }

  while (options.length < 4) {
    options.push(`Option ${String.fromCharCode(65 + options.length)}`);
  }

  const correctIndexRaw = Number(raw.correctAnswerIndex ?? 0);
  const correctIndex = Number.isInteger(correctIndexRaw)
    ? Math.max(0, Math.min(3, correctIndexRaw))
    : 0;

  const explanation = String(raw.explanationInVietnamese ?? "").trim() || `Giai thich cho cau hoi ${questionIndex + 1}.`;

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
  const userPrompt = [
    `Topic: ${topic}`,
    `Genre: ${genreLabel}`,
    `English level: ${levelLabel}`,
    `Question count: ${totalQuestions}`,
    "Return strict JSON only.",
  ].join("\n");

  const generated = await generateJsonFromProvider<ListeningAiPayload>({
    provider,
    systemPrompt,
    userPrompt,
    temperature: 0.55,
  });

  const transcript = String(generated.transcript ?? "").trim();
  if (!transcript) {
    throw new Error("Listening AI response is missing transcript");
  }

  const rawQuestions = Array.isArray(generated.questions) ? generated.questions : [];
  const normalizedQuestions = rawQuestions
    .slice(0, totalQuestions)
    .map((question, index) => normalizeAiQuestion(question, index))
    .filter((question): question is ListeningQuestion => Boolean(question));

  if (normalizedQuestions.length !== totalQuestions) {
    throw new Error("Listening AI response does not include enough valid questions");
  }

  const title = String(generated.title ?? "").trim() || `Listening practice - ${genreLabel}`;

  return {
    Title: title,
    Transcript: transcript,
    Questions: normalizedQuestions,
  };
}

function getGenreLabel(genre: number): string {
  return genreMap[genre] ?? "General";
}

export async function generateListeningExercise(input: {
  Genre: number;
  EnglishLevel: number;
  TotalQuestions: number;
  CustomTopic?: string;
  AiModel?: number;
}) {
  const totalQuestions = Math.min(15, Math.max(1, Number(input.TotalQuestions) || 5));
  const exerciseId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_MS);
  const genreLabel = getGenreLabel(input.Genre);
  const generated = await generateListeningFromAi({ ...input, TotalQuestions: totalQuestions });

  const exercise: ListeningExercise = {
    ExerciseId: exerciseId,
    Title: generated.Title,
    Genre: genreLabel,
    EnglishLevel: Number(input.EnglishLevel) || 1,
    Transcript: generated.Transcript,
    Questions: generated.Questions,
    CreatedAt: now.toISOString(),
    ExpiresAt: expiresAt.toISOString(),
  };

  exercises.set(exerciseId, exercise);
  return exercise;
}

export function gradeListeningExercise(input: {
  ExerciseId: string;
  Answers: Array<{ QuestionIndex: number; SelectedOptionIndex: number }>;
}) {
  const exercise = exercises.get(input.ExerciseId);
  if (!exercise) {
    return null;
  }

  if (new Date(exercise.ExpiresAt).getTime() < Date.now()) {
    exercises.delete(input.ExerciseId);
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

  return {
    ExerciseId: exercise.ExerciseId,
    Title: exercise.Title,
    Transcript: exercise.Transcript,
    AudioContent: exercise.AudioContent,
    TotalQuestions: feedback.length,
    CorrectAnswers: correctAnswers,
    Score: score,
    Questions: feedback,
  };
}

export function getRecentListeningExercises(take?: number) {
  const limit = Math.min(50, Math.max(1, take ?? 20));
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
