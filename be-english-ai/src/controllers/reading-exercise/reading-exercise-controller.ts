import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import {
  addReadingQuestions,
  createReadingPassage,
  createReadingWithAi,
  deleteReadingExercise,
  generateAiReading,
  getReadingExerciseById,
  listReadingExercises,
  submitReadingResult,
  updateReadingExercise,
} from "../../services/reading-exercise-service";

export async function listReadingExercisesHandler(req: Request, res: Response): Promise<void> {
  const level = req.query.level as string | undefined;
  const type = req.query.type as string | undefined;
  const sourceType = req.query.sourceType as string | undefined;

  const result = await listReadingExercises({
    ...(level ? { level } : {}),
    ...(type ? { type } : {}),
    ...(sourceType ? { sourceType } : {}),
  });
  res.status(HTTP_STATUS.OK).json(result);
}

export async function getReadingExerciseByIdHandler(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid id" });
    return;
  }

  const exercise = await getReadingExerciseById(id);
  if (!exercise) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Exercise not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(exercise);
}

export async function createReadingPassageHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    title: string;
    content: string;
    partType: string;
    level?: string;
    createdBy?: number;
  };

  if (!body?.title || !body?.content) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "title and content are required" });
    return;
  }

  const created = await createReadingPassage(body);
  res.status(HTTP_STATUS.OK).json({
    exerciseId: created?.ExerciseId,
    id: created?.Id,
    title: created?.Title,
    name: created?.Name,
    content: created?.Content,
    level: created?.Level,
    type: created?.Type,
    createdAt: created?.CreatedAt,
    isActive: false,
    message: "Passage created successfully. Please add questions to activate the exercise.",
  });
}

export async function addReadingQuestionsHandler(req: Request, res: Response): Promise<void> {
  const exerciseId = Number(req.params.id);
  if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid exercise id" });
    return;
  }

  const body = req.body as { questions: Array<any> };
  const questions = (body.questions ?? []).map((q) => ({
    questionText: q.questionText ?? q.QuestionText ?? "",
    optionA: q.optionA ?? q.OptionA ?? "",
    optionB: q.optionB ?? q.OptionB ?? "",
    optionC: q.optionC ?? q.OptionC ?? "",
    optionD: q.optionD ?? q.OptionD ?? "",
    correctAnswer: Number(q.correctAnswer ?? q.CorrectAnswer ?? 0),
    explanation: q.explanation ?? q.Explanation ?? "",
  }));

  const updated = await addReadingQuestions(exerciseId, questions);
  if (!updated) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Exercise not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(updated);
}

export async function createReadingWithAiHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    title: string;
    content: string;
    type: string;
    level?: string;
    topic?: string;
    createdBy?: number;
    provider?: string;
  };

  const created = await createReadingWithAi(body);
  if (!created) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: "Unable to create AI exercise" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(created);
}

export async function generateAiReadingHandler(req: Request, res: Response): Promise<void> {
  const result = await generateAiReading(req.body);
  if (!result) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: "Unable to generate exercise" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(result);
}

export async function submitReadingResultHandler(req: Request, res: Response): Promise<void> {
  const result = await submitReadingResult(req.body);
  if (!result.success) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(result);
    return;
  }

  res.status(HTTP_STATUS.OK).json(result);
}

export async function updateReadingExerciseHandler(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid id" });
    return;
  }

  const body = req.body as { title: string; content: string; level: string; type: string; description?: string };
  const updated = await updateReadingExercise(id, body);
  if (!updated) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Exercise not found" });
    return;
  }

  const exercise = await getReadingExerciseById(id);
  res.status(HTTP_STATUS.OK).json(exercise);
}

export async function deleteReadingExerciseHandler(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid id" });
    return;
  }

  const deleted = await deleteReadingExercise(id);
  if (!deleted) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Exercise not found" });
    return;
  }

  res.status(HTTP_STATUS.NO_CONTENT).send();
}
