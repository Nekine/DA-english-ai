import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import {
  analyzeSpeaking,
  generateSpeakingExercise,
  getSpeakingEnglishLevels,
  getSpeakingTopics,
} from "../../services/speaking-service";

export function getSpeakingTopicsHandler(_req: Request, res: Response): void {
  res.status(HTTP_STATUS.OK).json(getSpeakingTopics());
}

export function getSpeakingEnglishLevelsHandler(_req: Request, res: Response): void {
  res.status(HTTP_STATUS.OK).json(getSpeakingEnglishLevels());
}

export function generateSpeakingHandler(req: Request, res: Response): void {
  const body = req.body as { Topic: number; EnglishLevel: number; CustomTopic?: string };
  const exercise = generateSpeakingExercise(body);
  res.status(HTTP_STATUS.OK).json(exercise);
}

export function analyzeSpeakingHandler(req: Request, res: Response): void {
  const body = req.body as { ExerciseId: string; AudioData: string };
  const analysis = analyzeSpeaking(body);
  if (!analysis) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Bai tap khong ton tai hoac da het han" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(analysis);
}
