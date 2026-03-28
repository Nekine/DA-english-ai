import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import { saveAiExercise, saveSentenceWritingExercise } from "../../services/exercise-service";

export async function saveExerciseHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    title?: string;
    topic?: string;
    content?: string;
    questions?: Array<{ Question: string; Options: string[]; RightOptionIndex: number }>;
    level?: string;
    type?: string;
    category?: string;
    estimatedMinutes?: number;
    timeLimit?: number;
    description?: string;
    createdBy?: number;
  };

  const result = await saveAiExercise({
    title: String(body.title ?? ""),
    topic: String(body.topic ?? "General"),
    ...(body.content ? { content: body.content } : {}),
    questions: Array.isArray(body.questions) ? body.questions : [],
    ...(body.level ? { level: body.level } : {}),
    ...(body.type ? { type: body.type } : {}),
    ...(body.category ? { category: body.category } : {}),
    ...(Number.isFinite(body.estimatedMinutes) ? { estimatedMinutes: Number(body.estimatedMinutes) } : {}),
    ...(Number.isFinite(body.timeLimit) ? { timeLimit: Number(body.timeLimit) } : {}),
    ...(body.description ? { description: body.description } : {}),
    ...(Number.isInteger(body.createdBy) ? { createdBy: Number(body.createdBy) } : {}),
  });

  if (!result.success) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(result);
    return;
  }

  res.status(HTTP_STATUS.OK).json(result);
}

export async function saveSentenceWritingHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    title?: string;
    topic?: string;
    content?: string;
    sentences?: Array<{ id: number; vietnamese: string; correctAnswer: string }>;
    level?: string;
    category?: string;
    estimatedMinutes?: number;
    timeLimit?: number;
    description?: string;
    createdBy?: number;
  };

  const result = await saveSentenceWritingExercise({
    title: String(body.title ?? ""),
    topic: String(body.topic ?? "General"),
    ...(body.content ? { content: body.content } : {}),
    sentences: Array.isArray(body.sentences) ? body.sentences : [],
    ...(body.level ? { level: body.level } : {}),
    ...(body.category ? { category: body.category } : {}),
    ...(Number.isFinite(body.estimatedMinutes) ? { estimatedMinutes: Number(body.estimatedMinutes) } : {}),
    ...(Number.isFinite(body.timeLimit) ? { timeLimit: Number(body.timeLimit) } : {}),
    ...(body.description ? { description: body.description } : {}),
    ...(Number.isInteger(body.createdBy) ? { createdBy: Number(body.createdBy) } : {}),
  });

  if (!result.success) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(result);
    return;
  }

  res.status(HTTP_STATUS.OK).json(result);
}
