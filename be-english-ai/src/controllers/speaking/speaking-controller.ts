import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import { getHttpStatusFromError } from "../../services/ai/ai-client";
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

export async function generateSpeakingHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as { Topic: number; EnglishLevel: number; CustomTopic?: string; AiModel?: number };

  try {
    const exercise = await generateSpeakingExercise(body);
    res.status(HTTP_STATUS.OK).json(exercise);
  } catch (error) {
    const status = getHttpStatusFromError(error, HTTP_STATUS.BAD_REQUEST);
    const message = error instanceof Error ? error.message : "Failed to generate speaking exercise";
    res.status(status).json({ message });
  }
}

export async function analyzeSpeakingHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as { ExerciseId: string; AudioData: string; AiModel?: number; TranscribedText?: string };

  let analysis;
  try {
    analysis = await analyzeSpeaking(body);
  } catch (error) {
    const status = getHttpStatusFromError(error, HTTP_STATUS.BAD_REQUEST);
    const message = error instanceof Error ? error.message : "Failed to analyze speaking exercise";
    res.status(status).json({ message });
    return;
  }

  if (!analysis) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Bai tap khong ton tai hoac da het han" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(analysis);
}
