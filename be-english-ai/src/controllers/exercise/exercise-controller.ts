import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import {
  getCreatedExerciseForPractice,
  listCreatedExercises,
  saveAiExercise,
  saveSentenceWritingExercise,
  submitAiExerciseResult,
  submitSentenceWritingResult,
} from "../../services/exercise-service";

function getAuthenticatedTaiKhoanId(req: Request): number {
  return Number(req.auth?.sub ?? 0);
}

export async function saveExerciseHandler(req: Request, res: Response): Promise<void> {
  const requestedByTaiKhoanId = getAuthenticatedTaiKhoanId(req);
  if (!Number.isInteger(requestedByTaiKhoanId) || requestedByTaiKhoanId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: "Invalid or missing token" });
    return;
  }

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
  };

  const result = await saveAiExercise({
    requestedByTaiKhoanId,
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
  });

  if (!result.success) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(result);
    return;
  }

  res.status(HTTP_STATUS.OK).json(result);
}

export async function saveSentenceWritingHandler(req: Request, res: Response): Promise<void> {
  const requestedByTaiKhoanId = getAuthenticatedTaiKhoanId(req);
  if (!Number.isInteger(requestedByTaiKhoanId) || requestedByTaiKhoanId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: "Invalid or missing token" });
    return;
  }

  const body = req.body as {
    title?: string;
    topic?: string;
    content?: string;
    sentences?: Array<{
      id: number;
      vietnamese: string;
      correctAnswer: string;
      suggestion?: {
        vocabulary?: Array<{ word: string; meaning: string }>;
        structure?: string;
      };
      Suggestion?: {
        Vocabulary?: Array<{ Word: string; Meaning: string }>;
        Structure?: string;
      };
    }>;
    level?: string;
    category?: string;
    estimatedMinutes?: number;
    timeLimit?: number;
    description?: string;
  };

  const result = await saveSentenceWritingExercise({
    requestedByTaiKhoanId,
    title: String(body.title ?? ""),
    topic: String(body.topic ?? "General"),
    ...(body.content ? { content: body.content } : {}),
    sentences: Array.isArray(body.sentences) ? body.sentences : [],
    ...(body.level ? { level: body.level } : {}),
    ...(body.category ? { category: body.category } : {}),
    ...(Number.isFinite(body.estimatedMinutes) ? { estimatedMinutes: Number(body.estimatedMinutes) } : {}),
    ...(Number.isFinite(body.timeLimit) ? { timeLimit: Number(body.timeLimit) } : {}),
    ...(body.description ? { description: body.description } : {}),
  });

  if (!result.success) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(result);
    return;
  }

  res.status(HTTP_STATUS.OK).json(result);
}

export async function submitExerciseResultHandler(req: Request, res: Response): Promise<void> {
  const requestedByTaiKhoanId = getAuthenticatedTaiKhoanId(req);
  if (!Number.isInteger(requestedByTaiKhoanId) || requestedByTaiKhoanId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: "Invalid or missing token" });
    return;
  }

  const body = req.body as {
    exerciseId?: number;
    answers?: string[];
    completedAt?: string;
  };

  const result = await submitAiExerciseResult({
    requestedByTaiKhoanId,
    exerciseId: Number(body.exerciseId ?? 0),
    answers: Array.isArray(body.answers) ? body.answers : [],
    ...(body.completedAt ? { completedAt: body.completedAt } : {}),
  });

  if (!result.success) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(result);
    return;
  }

  res.status(HTTP_STATUS.OK).json(result);
}

export async function submitSentenceWritingResultHandler(req: Request, res: Response): Promise<void> {
  const requestedByTaiKhoanId = getAuthenticatedTaiKhoanId(req);
  if (!Number.isInteger(requestedByTaiKhoanId) || requestedByTaiKhoanId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: "Invalid or missing token" });
    return;
  }

  const body = req.body as {
    exerciseId?: number;
    answers?: Array<{ sentenceId?: number; userTranslation: string }>;
    completedAt?: string;
  };

  const result = await submitSentenceWritingResult({
    requestedByTaiKhoanId,
    exerciseId: Number(body.exerciseId ?? 0),
    answers: Array.isArray(body.answers) ? body.answers : [],
    ...(body.completedAt ? { completedAt: body.completedAt } : {}),
  });

  if (!result.success) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(result);
    return;
  }

  res.status(HTTP_STATUS.OK).json(result);
}

export async function listCreatedExercisesHandler(req: Request, res: Response): Promise<void> {
  const requestedByTaiKhoanId = getAuthenticatedTaiKhoanId(req);
  if (!Number.isInteger(requestedByTaiKhoanId) || requestedByTaiKhoanId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: "Invalid or missing token" });
    return;
  }

  const kind = String(req.query.kind ?? "").trim().toLowerCase();
  if (kind !== "grammar" && kind !== "writing") {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "kind must be grammar or writing" });
    return;
  }

  const takeRaw = Number(req.query.take);
  const take = Number.isFinite(takeRaw) ? takeRaw : undefined;

  const items = await listCreatedExercises({
    requestedByTaiKhoanId,
    kind,
    ...(typeof take === "number" ? { take } : {}),
  });

  res.status(HTTP_STATUS.OK).json({ success: true, items });
}

export async function getCreatedExerciseHandler(req: Request, res: Response): Promise<void> {
  const requestedByTaiKhoanId = getAuthenticatedTaiKhoanId(req);
  if (!Number.isInteger(requestedByTaiKhoanId) || requestedByTaiKhoanId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: "Invalid or missing token" });
    return;
  }

  const exerciseId = Number(req.params.id);
  if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Invalid exercise id" });
    return;
  }

  const kind = String(req.query.kind ?? "").trim().toLowerCase();
  if (kind !== "grammar" && kind !== "writing") {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "kind must be grammar or writing" });
    return;
  }

  const detail = await getCreatedExerciseForPractice({
    requestedByTaiKhoanId,
    exerciseId,
    kind,
  });

  if (!detail) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Exercise not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json({ success: true, data: detail });
}
