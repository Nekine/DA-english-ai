import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import {
  generateAssignments,
  getAssignmentEnglishLevels,
  getAssignmentTypes,
  suggestTopics,
} from "../../services/assignment-service";

export async function generateAssignmentHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    Topic: string;
    AssignmentTypes: number[];
    EnglishLevel: number;
    TotalQuestions: number;
  };

  const provider = typeof req.query.provider === "string" ? req.query.provider : "gemini";

  const result = await generateAssignments({
    ...body,
    provider,
  });
  if (result.error) {
    res.status(result.status || HTTP_STATUS.BAD_REQUEST).json({ message: result.error });
    return;
  }

  res.status(result.status || HTTP_STATUS.CREATED).json(result.data);
}

export function getAssignmentEnglishLevelsHandler(_req: Request, res: Response): void {
  res.status(HTTP_STATUS.OK).json(getAssignmentEnglishLevels());
}

export function getAssignmentTypesHandler(_req: Request, res: Response): void {
  res.status(HTTP_STATUS.OK).json(getAssignmentTypes());
}

export async function suggestAssignmentTopicsHandler(req: Request, res: Response): Promise<void> {
  const englishLevel = Number(req.query.englishLevel ?? 3);
  const provider = typeof req.query.provider === "string" ? req.query.provider : undefined;
  const topics = await suggestTopics(englishLevel, provider);
  res.status(HTTP_STATUS.CREATED).json(topics);
}
