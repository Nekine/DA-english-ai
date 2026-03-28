import { randomUUID } from "node:crypto";

type ListeningQuestion = {
  Question: string;
  Options: string[];
  RightOptionIndex: number;
  ExplanationInVietnamese: string;
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

export function getListeningGenres() {
  return genreMap;
}

function buildOptions(answer: string): string[] {
  return [answer, `${answer}ing`, `${answer}ed`, `${answer}s`];
}

function buildQuestions(totalQuestions: number): ListeningQuestion[] {
  const questions: ListeningQuestion[] = [];
  for (let i = 0; i < totalQuestions; i += 1) {
    const answer = `option${i + 1}`;
    questions.push({
      Question: `Choose the best answer for detail #${i + 1}.`,
      Options: buildOptions(answer),
      RightOptionIndex: 0,
      ExplanationInVietnamese: "Dua vao noi dung bai nghe de chon dap an phu hop nhat.",
    });
  }
  return questions;
}

function getGenreLabel(genre: number): string {
  return genreMap[genre] ?? "General";
}

export function generateListeningExercise(input: {
  Genre: number;
  EnglishLevel: number;
  TotalQuestions: number;
  CustomTopic?: string;
}) {
  const totalQuestions = Math.min(15, Math.max(1, Number(input.TotalQuestions) || 5));
  const exerciseId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_MS);
  const genreLabel = getGenreLabel(input.Genre);
  const topic = input.CustomTopic?.trim() || "general listening topic";

  const exercise: ListeningExercise = {
    ExerciseId: exerciseId,
    Title: `Listening practice - ${genreLabel}`,
    Genre: genreLabel,
    EnglishLevel: Number(input.EnglishLevel) || 1,
    Transcript: `This is a ${genreLabel.toLowerCase()} transcript about ${topic}.`,
    Questions: buildQuestions(totalQuestions),
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
