import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import { generateReviewText, saveReviewWritingExercise } from "../../services/review-service";

export async function generateReviewHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    UserLevel?: number;
    Requirement?: string;
    Content?: string;
  };

  const provider = typeof req.query.provider === "string" ? req.query.provider : "gemini";
  const result = await generateReviewText({
    userLevel: Number(body.UserLevel ?? 3),
    requirement: String(body.Requirement ?? ""),
    content: String(body.Content ?? ""),
    provider,
  });

  if (result.error) {
    res.status(result.status || HTTP_STATUS.BAD_REQUEST).json({ message: result.error });
    return;
  }

  res.status(result.status || HTTP_STATUS.OK).type("text/plain").send(result.text ?? "");
}

export async function saveWritingExerciseHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    title?: string;
    content?: string;
    requirement?: string;
    level?: string;
    category?: string;
    estimatedMinutes?: number;
    timeLimit?: number;
    description?: string;
    createdBy?: number;
  };

  const title = String(body.title ?? "").trim();
  const requirement = String(body.requirement ?? "").trim();

  if (!title) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "title is required" });
    return;
  }
  if (!requirement) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "requirement is required" });
    return;
  }

  const result = await saveReviewWritingExercise({
    title,
    ...(body.content ? { content: body.content } : {}),
    requirement,
    ...(body.level ? { level: body.level } : {}),
    ...(body.category ? { category: body.category } : {}),
    estimatedMinutes: Number(body.estimatedMinutes ?? 20),
    timeLimit: Number(body.timeLimit ?? 30),
    ...(body.description ? { description: body.description } : {}),
    createdBy: Number(body.createdBy ?? 1),
  });

  res.status(HTTP_STATUS.OK).json(result);
}
