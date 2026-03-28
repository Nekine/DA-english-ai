import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import {
  generateListeningExercise,
  getListeningGenres,
  getRecentListeningExercises,
  gradeListeningExercise,
} from "../../services/listening-service";

export function getListeningGenresHandler(_req: Request, res: Response): void {
  res.status(HTTP_STATUS.OK).json(getListeningGenres());
}

export function generateListeningHandler(req: Request, res: Response): void {
  const body = req.body as {
    Genre: number;
    EnglishLevel: number;
    TotalQuestions: number;
    CustomTopic?: string;
  };

  const exercise = generateListeningExercise(body);
  res.status(HTTP_STATUS.OK).json(exercise);
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
