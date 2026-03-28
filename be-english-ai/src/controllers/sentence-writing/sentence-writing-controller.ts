import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import { generateSentenceWriting } from "../../services/sentence-writing-service";

export async function generateSentenceWritingHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    Topic?: string;
    Level?: number;
    SentenceCount?: number;
    WritingStyle?: string;
  };

  const provider = typeof req.query.provider === "string" ? req.query.provider : "gemini";

  const result = await generateSentenceWriting({
    Topic: String(body.Topic ?? ""),
    Level: Number(body.Level ?? 3),
    SentenceCount: Number(body.SentenceCount ?? 5),
    ...(body.WritingStyle ? { WritingStyle: body.WritingStyle } : {}),
    provider,
  });

  if (result.error) {
    res.status(result.status || HTTP_STATUS.BAD_REQUEST).json({ message: result.error });
    return;
  }

  res.status(result.status || HTTP_STATUS.CREATED).json(result.data);
}
