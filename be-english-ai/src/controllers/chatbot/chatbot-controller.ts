import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import { generateChatbotAnswer } from "../../services/chatbot-service";

export async function generateChatbotAnswerHandler(req: Request, res: Response): Promise<void> {
  const username = String(req.query.username ?? "");
  const gender = String(req.query.gender ?? "unknown");
  const age = Number(req.query.age ?? 18);
  const englishLevel = Number(req.query.englishLevel ?? 3);
  const enableReasoning = String(req.query.enableReasoning ?? "false").toLowerCase() === "true";
  const enableSearching = String(req.query.enableSearching ?? "false").toLowerCase() === "true";
  const provider = String(req.query.provider ?? "openai");

  const result = await generateChatbotAnswer({
    request: (req.body as { ChatHistory?: Array<{ FromUser: boolean; Message: string }>; Question?: string }) ?? {},
    username,
    gender,
    age,
    englishLevel,
    enableReasoning,
    enableSearching,
    provider,
  });

  if (result.error) {
    res.status(result.status || HTTP_STATUS.BAD_REQUEST).json({ message: result.error });
    return;
  }

  res.status(result.status).type("text/plain").send(result.text ?? "");
}
