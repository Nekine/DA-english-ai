import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import {
  createWritingExercise,
  deleteWritingExercise,
  getWritingExerciseById,
  getWritingExercises,
  updateWritingExercise,
} from "../../services/writing-exercise-service";

type WritingType = "writing_essay" | "writing_sentence";

export async function getWritingExercisesHandler(req: Request, res: Response): Promise<void> {
  const type = req.query.type as WritingType | undefined;
  const exercises = await getWritingExercises(type);
  res.status(HTTP_STATUS.OK).json({ success: true, exercises });
}

export async function getWritingExerciseByIdHandler(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Invalid id" });
    return;
  }

  const exercise = await getWritingExerciseById(id);
  if (!exercise) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Exercise not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json({ success: true, exercise });
}

export async function createWritingExerciseHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as {
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
  };

  if (!body?.title || !body?.type) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "title and type are required" });
    return;
  }

  const id = await createWritingExercise(body);
  res.status(HTTP_STATUS.OK).json({ success: true, message: "Exercise created successfully", id });
}

export async function updateWritingExerciseHandler(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Invalid id" });
    return;
  }

  const updated = await updateWritingExercise(id, req.body);
  if (!updated) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Exercise not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json({ success: true, message: "Exercise updated successfully" });
}

export async function deleteWritingExerciseHandler(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Invalid id" });
    return;
  }

  const deleted = await deleteWritingExercise(id);
  if (!deleted) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Exercise not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json({ success: true, message: "Exercise deleted successfully" });
}
