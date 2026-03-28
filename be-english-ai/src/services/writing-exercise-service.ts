import { WritingExerciseRepository } from "../database/repositories/writing-exercise-repository";

const writingExerciseRepository = new WritingExerciseRepository();

type WritingType = "writing_essay" | "writing_sentence";

function ensureJson(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return "[]";
}

export async function getWritingExercises(type?: WritingType) {
  const exercises = await writingExerciseRepository.getAll(type);
  return exercises.map((e) => ({
    id: e.id,
    title: e.title,
    content: e.content,
    questionsJson: e.questionsJson,
    correctAnswersJson: e.correctAnswersJson,
    level: e.level,
    type: e.type,
    category: e.category,
    estimatedMinutes: e.estimatedMinutes,
    timeLimit: e.timeLimit,
    description: e.description,
    isActive: e.isActive,
    createdAt: e.createdAt.toISOString(),
  }));
}

export async function getWritingExerciseById(id: number) {
  const e = await writingExerciseRepository.getById(id);
  if (!e) {
    return null;
  }

  return {
    id: e.id,
    title: e.title,
    content: e.content,
    questionsJson: e.questionsJson,
    correctAnswersJson: e.correctAnswersJson,
    level: e.level,
    type: e.type,
    category: e.category,
    estimatedMinutes: e.estimatedMinutes,
    timeLimit: e.timeLimit,
    description: e.description,
    isActive: e.isActive,
    createdAt: e.createdAt.toISOString(),
  };
}

export async function createWritingExercise(input: {
  title: string;
  content?: string;
  questionsJson?: string;
  correctAnswersJson?: string;
  level?: string;
  type: WritingType;
  category?: string;
  estimatedMinutes?: number;
  timeLimit?: number;
  description?: string;
  createdBy?: number;
}) {
  const id = await writingExerciseRepository.create({
    title: input.title,
    content: input.content ?? null,
    questionsJson: ensureJson(input.questionsJson),
    correctAnswersJson: ensureJson(input.correctAnswersJson),
    level: input.level ?? null,
    type: input.type,
    category: input.category ?? null,
    estimatedMinutes: input.estimatedMinutes ?? null,
    timeLimit: input.timeLimit ?? null,
    description: input.description ?? null,
    createdBy: input.createdBy ?? null,
  });

  return id;
}

export async function updateWritingExercise(
  id: number,
  input: {
    title: string;
    content?: string;
    questionsJson?: string;
    correctAnswersJson?: string;
    level?: string;
    type: WritingType;
    category?: string;
    estimatedMinutes?: number;
    timeLimit?: number;
    description?: string;
  },
) {
  return writingExerciseRepository.update(id, {
    title: input.title,
    content: input.content ?? null,
    questionsJson: ensureJson(input.questionsJson),
    correctAnswersJson: ensureJson(input.correctAnswersJson),
    level: input.level ?? null,
    type: input.type,
    category: input.category ?? null,
    estimatedMinutes: input.estimatedMinutes ?? null,
    timeLimit: input.timeLimit ?? null,
    description: input.description ?? null,
    createdBy: null,
  });
}

export async function deleteWritingExercise(id: number) {
  return writingExerciseRepository.remove(id);
}
