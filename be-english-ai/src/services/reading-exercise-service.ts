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

function parseQuestionsJson(raw: string): ReadingQuestion[] {
  try {
    const data = JSON.parse(raw) as Array<{
      questionText?: string;
      question?: string;
      options?: string[];
      correctAnswer?: number;
      explanation?: string;
    }>;

    return data.map((item) => ({
      question: item.questionText ?? item.question ?? "",
      options: Array.isArray(item.options) ? item.options : [],
      correctAnswer: Number(item.correctAnswer ?? 0),
      ...(item.explanation ? { explanation: item.explanation } : {}),
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

type ReadingAiPayload = {
  title?: string;
  content?: string;
  questions?: Array<{
    questionText?: string;
    options?: string[];
    correctAnswer?: number;
    explanation?: string;
  }>;
};

export async function listReadingExercises(filters: {
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

  const rows = await readingRepository.getAll(filters);
  return rows.map((row) => mapExercise(row));
}

export async function getReadingExerciseById(id: number) {
  if (!appConfig.db.enabled) {
    return inMemoryReadingExercises.get(id) ?? null;
  }

  const row = await readingRepository.getById(id);
  return mapExercise(row);
}

export async function createReadingPassage(input: {
  title: string;
  content: string;
  partType: string;
  level?: string;
  createdBy?: number;
}) {
  const id = await readingRepository.createPassage({
    title: input.title,
    content: input.content,
    level: input.level ?? "Intermediate",
    partType: input.partType ?? "Part 6",
    createdBy: input.createdBy ?? null,
  });

  return getReadingExerciseById(id);
}

export async function addReadingQuestions(exerciseId: number, questions: ReadingQuestionInput[]) {
  const updated = await readingRepository.setQuestions(exerciseId, questions);
  if (!updated) {
    return null;
  }

  return getReadingExerciseById(exerciseId);
}

export async function createReadingWithAi(input: {
  title: string;
  content: string;
  type: string;
  level?: string;
  topic?: string;
  createdBy?: number;
  provider?: string;
}) {
  const type = (input.type || "Part 7") as "Part 5" | "Part 6" | "Part 7";
  const level = (input.level || "Intermediate") as "Beginner" | "Intermediate" | "Advanced";

  const generated = await generateAiReading({
    topic: input.topic || input.title || "General",
    level,
    type,
    provider: (input.provider as "gemini" | "openai" | "xai" | undefined) ?? "openai",
  });

  return generated?.Exercise ?? null;
}

export async function generateAiReading(input: {
  topic: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  type: "Part 5" | "Part 6" | "Part 7";
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

  let generated: ReadingAiPayload;
  try {
    generated = await generateJsonFromProvider<ReadingAiPayload>({
      provider,
      systemPrompt,
      userPrompt,
      temperature: 0.6,
    });
  } catch {
    return null;
  }

  const title = String(generated?.title ?? "").trim();
  const content = String(generated?.content ?? "").trim();
  const rawQuestions = Array.isArray(generated?.questions) ? generated.questions : [];

  const aiQuestions: ReadingQuestionInput[] = rawQuestions.slice(0, expectedQuestionCount).map((q) => {
    const options = Array.isArray(q.options) ? q.options.slice(0, 4).map((opt) => String(opt ?? "")) : [];

    return {
      questionText: String(q.questionText ?? "").trim(),
      optionA: options[0] ?? "",
      optionB: options[1] ?? "",
      optionC: options[2] ?? "",
      optionD: options[3] ?? "",
      correctAnswer: Number(q.correctAnswer ?? 0),
      explanation: String(q.explanation ?? "").trim(),
    };
  });

  if (!title || !content || aiQuestions.length === 0) {
    return null;
  }

  for (const question of aiQuestions) {
    const validOptions = [question.optionA, question.optionB, question.optionC, question.optionD].every((x) => x.trim().length > 0);
    const validAnswer = Number.isInteger(question.correctAnswer) && question.correctAnswer >= 0 && question.correctAnswer <= 3;

    if (!question.questionText || !validOptions || !validAnswer) {
      return null;
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
    title,
    content,
    partType: input.type,
    level: input.level,
  });

  if (!created) {
    return null;
  }

  await addReadingQuestions(created.ExerciseId, aiQuestions);
  const exercise = await getReadingExerciseById(created.ExerciseId);
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
  userId: number;
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

  const exercise = await readingRepository.getById(input.exerciseId);
  if (!exercise) {
    return { success: false, message: "Exercise not found" };
  }

  const userExists = await readingRepository.userExists(input.userId);
  if (!userExists) {
    return { success: false, message: "User not found" };
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
    userId: input.userId,
    exerciseId: input.exerciseId,
    score,
    totalQuestions,
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
  input: { title: string; content: string; level: string; type: string; description?: string },
) {
  return readingRepository.updateExercise(id, input);
}

export async function deleteReadingExercise(id: number) {
  return readingRepository.remove(id);
}
