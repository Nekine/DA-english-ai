import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import { getHttpStatusFromError } from "../../services/ai/ai-client";
import { logger } from "../../utils/logger";
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
    const status = getHttpStatusFromError(error, 502);
    const message = error instanceof Error ? error.message : "Failed to generate speaking exercise";
    logger.warn("Speaking generate failed", {
      status,
      message,
      topic: body?.Topic,
      englishLevel: body?.EnglishLevel,
      aiModel: body?.AiModel,
      hasCustomTopic: typeof body?.CustomTopic === "string" && body.CustomTopic.trim().length > 0,
    });
    res.status(status).json({ message });
  }
}

export async function analyzeSpeakingHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as { ExerciseId: string; AudioData: string; AiModel?: number; TranscribedText?: string };

  let analysis;
  try {
    analysis = await analyzeSpeaking(body);
  } catch (error) {
    const status = getHttpStatusFromError(error, 502);
    const message = error instanceof Error ? error.message : "Failed to analyze speaking exercise";
    logger.warn("Speaking analyze failed", {
      status,
      message,
      exerciseId: body?.ExerciseId,
      aiModel: body?.AiModel,
      hasTranscript: typeof body?.TranscribedText === "string" && body.TranscribedText.trim().length > 0,
    });
    res.status(status).json({ message });
    return;
  }

  if (!analysis) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Bai tap khong ton tai hoac da het han" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(analysis);
}
