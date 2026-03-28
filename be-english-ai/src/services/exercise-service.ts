import { exerciseRepository } from "../database/repositories/exercise-repository";
import { appConfig } from "../config";

type MultipleChoiceQuestion = {
  Question: string;
  Options: string[];
  RightOptionIndex: number;
};

type SentenceWritingItem = {
  id: number;
  vietnamese: string;
  correctAnswer: string;
};

function optionIndexToLetter(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index > 25) {
    return "A";
  }
  return String.fromCharCode(65 + index);
}

export async function saveAiExercise(input: {
  title: string;
  topic: string;
  content?: string;
  questions: MultipleChoiceQuestion[];
  level?: string;
  type?: string;
  category?: string;
  estimatedMinutes?: number;
  timeLimit?: number;
  description?: string;
  createdBy?: number;
}) {
  if (!input.questions || input.questions.length === 0) {
    return { success: false, message: "Invalid exercise data" };
  }

  if (!appConfig.db.enabled) {
    return {
      success: true,
      message: "Exercise generated successfully (no-db mode)",
      exerciseId: Date.now(),
    };
  }

  const questionsJson = JSON.stringify(
    input.questions.map((q) => ({ q: q.Question, options: q.Options })),
  );
  const correctAnswersJson = JSON.stringify(
    input.questions.map((q) => optionIndexToLetter(q.RightOptionIndex)),
  );

  const exerciseId = await exerciseRepository.save({
    title: input.title,
    content: input.content ?? null,
    questionsJson,
    correctAnswersJson,
    level: input.level ?? "A1",
    type: input.type ?? "mixed",
    category: input.category ?? input.topic,
    estimatedMinutes: input.estimatedMinutes ?? 10,
    timeLimit: input.timeLimit ?? 600,
    description: input.description ?? null,
    sourceType: "ai_generated",
    createdBy: input.createdBy ?? 1,
  });

  return {
    success: true,
    message: "Exercise saved successfully",
    exerciseId,
  };
}

export async function saveSentenceWritingExercise(input: {
  title: string;
  topic: string;
  content?: string;
  sentences: SentenceWritingItem[];
  level?: string;
  category?: string;
  estimatedMinutes?: number;
  timeLimit?: number;
  description?: string;
  createdBy?: number;
}) {
  if (!input.sentences || input.sentences.length === 0) {
    return { success: false, message: "Invalid sentence writing data" };
  }

  if (!appConfig.db.enabled) {
    return {
      success: true,
      message: "Sentence writing generated successfully (no-db mode)",
      exerciseId: Date.now(),
    };
  }

  const questionsJson = JSON.stringify(
    input.sentences.map((s) => ({ q: s.vietnamese, options: [] as string[] })),
  );
  const correctAnswersJson = JSON.stringify(
    input.sentences.map((s) => s.correctAnswer),
  );

  const exerciseId = await exerciseRepository.save({
    title: input.title,
    content: input.content ?? null,
    questionsJson,
    correctAnswersJson,
    level: input.level ?? "Intermediate",
    type: "sentence_writing",
    category: input.category ?? input.topic,
    estimatedMinutes: input.estimatedMinutes ?? 15,
    timeLimit: input.timeLimit ?? 900,
    description: input.description ?? null,
    sourceType: "ai_generated_writing",
    createdBy: input.createdBy ?? 1,
  });

  return {
    success: true,
    message: "Sentence writing exercise saved successfully",
    exerciseId,
  };
}
