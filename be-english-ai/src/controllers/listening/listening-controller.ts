import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import { getHttpStatusFromError } from "../../services/ai/ai-client";
import { logger } from "../../utils/logger";
import {
  generateListeningExercise,
  getListeningGenres,
  getListeningExerciseById,
  getRecentListeningExercises,
  gradeListeningExercise,
} from "../../services/listening-service";

function getAuthenticatedTaiKhoanId(req: Request): number {
  return Number(req.auth?.sub ?? 0);
}

export function getListeningGenresHandler(_req: Request, res: Response): void {
  res.status(HTTP_STATUS.OK).json(getListeningGenres());
}

export async function generateListeningHandler(req: Request, res: Response): Promise<void> {
  const requestedByTaiKhoanId = getAuthenticatedTaiKhoanId(req);
  if (!Number.isInteger(requestedByTaiKhoanId) || requestedByTaiKhoanId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: "Invalid or missing token" });
    return;
  }

  const body = req.body as {
    Genre: number;
    EnglishLevel: number;
    TotalQuestions: number;
    CustomTopic?: string;
    AiModel?: number;
  };

  try {
    const exercise = await generateListeningExercise({
      requestedByTaiKhoanId,
      ...body,
    });
    res.status(HTTP_STATUS.OK).json(exercise);
  } catch (error) {
    const status = getHttpStatusFromError(error, 502);
    const message = error instanceof Error ? error.message : "Failed to generate listening exercise";

    logger.warn("Listening generate failed", {
      status,
      message,
      genre: body?.Genre,
      englishLevel: body?.EnglishLevel,
      totalQuestions: body?.TotalQuestions,
      aiModel: body?.AiModel,
      hasCustomTopic: typeof body?.CustomTopic === "string" && body.CustomTopic.trim().length > 0,
    });

    res.status(status).json({ message });
  }
}

export async function gradeListeningHandler(req: Request, res: Response): Promise<void> {
  const requestedByTaiKhoanId = getAuthenticatedTaiKhoanId(req);
  if (!Number.isInteger(requestedByTaiKhoanId) || requestedByTaiKhoanId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: "Invalid or missing token" });
    return;
  }

  const body = req.body as {
    ExerciseId: string;
    Answers: Array<{ QuestionIndex: number; SelectedOptionIndex: number }>;
    startedAt?: string;
    completedAt?: string;
    timeSpentSeconds?: number;
  };

  const result = await gradeListeningExercise({
    requestedByTaiKhoanId,
    ExerciseId: String(body.ExerciseId ?? ""),
    Answers: Array.isArray(body.Answers) ? body.Answers : [],
    ...(body.startedAt ? { startedAt: String(body.startedAt) } : {}),
    ...(body.completedAt ? { completedAt: String(body.completedAt) } : {}),
    ...(Number.isFinite(body.timeSpentSeconds)
      ? { timeSpentSeconds: Number(body.timeSpentSeconds) }
      : {}),
  });

  if (!result) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Khong tim thay bai nghe." });
    return;
  }

  res.status(HTTP_STATUS.OK).json(result);
}

export async function getRecentListeningHandler(req: Request, res: Response): Promise<void> {
  const requestedByTaiKhoanId = getAuthenticatedTaiKhoanId(req);
  if (!Number.isInteger(requestedByTaiKhoanId) || requestedByTaiKhoanId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: "Invalid or missing token" });
    return;
  }

  const takeRaw = Number(req.query.take);
  const take = Number.isFinite(takeRaw) ? takeRaw : undefined;
  const result = await getRecentListeningExercises(requestedByTaiKhoanId, take);
  res.status(HTTP_STATUS.OK).json(result);
}

export async function getListeningByIdHandler(req: Request, res: Response): Promise<void> {
  const requestedByTaiKhoanId = getAuthenticatedTaiKhoanId(req);
  if (!Number.isInteger(requestedByTaiKhoanId) || requestedByTaiKhoanId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: "Invalid or missing token" });
    return;
  }

  const exerciseId = String(req.params.id ?? "").trim();
  if (!exerciseId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid exercise id" });
    return;
  }

  const exercise = await getListeningExerciseById({
    requestedByTaiKhoanId,
    exerciseId,
  });

  if (!exercise) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Exercise not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(exercise);
}
