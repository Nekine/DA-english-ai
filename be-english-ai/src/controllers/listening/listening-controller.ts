import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import { getHttpStatusFromError } from "../../services/ai/ai-client";
import {
  generateListeningExercise,
  getListeningGenres,
  getRecentListeningExercises,
  gradeListeningExercise,
} from "../../services/listening-service";

export function getListeningGenresHandler(_req: Request, res: Response): void {
  res.status(HTTP_STATUS.OK).json(getListeningGenres());
}

export async function generateListeningHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    Genre: number;
    EnglishLevel: number;
    TotalQuestions: number;
    CustomTopic?: string;
    AiModel?: number;
  };

  try {
    const exercise = await generateListeningExercise(body);
    res.status(HTTP_STATUS.OK).json(exercise);
  } catch (error) {
    const status = getHttpStatusFromError(error, HTTP_STATUS.BAD_REQUEST);
    const message = error instanceof Error ? error.message : "Failed to generate listening exercise";
    res.status(status).json({ message });
  }
}

export function gradeListeningHandler(req: Request, res: Response): void {
  const result = gradeListeningExercise(req.body);
  if (!result) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Khong tim thay bai nghe hoac bai da het han." });
    return;
  }

  res.status(HTTP_STATUS.OK).json(result);
}

export function getRecentListeningHandler(req: Request, res: Response): void {
  const takeRaw = Number(req.query.take);
  const take = Number.isFinite(takeRaw) ? takeRaw : undefined;
  const result = getRecentListeningExercises(take);
  res.status(HTTP_STATUS.OK).json(result);
}
