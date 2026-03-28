import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";

export async function healthcheckHandler(_req: Request, res: Response): Promise<void> {
  res.status(HTTP_STATUS.OK).json(true);
}

export async function sendFeedbackHandler(req: Request, res: Response): Promise<void> {
  const userFeedback = String(req.body ?? "").trim();
  const userName = String(req.query.userName ?? "Anonymous");

  if (!userFeedback) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "userFeedback is required" });
    return;
  }

  // Feedback is accepted for compatibility; persistence can be added later.
  console.info(`[Healthcheck][Feedback] ${userName}: ${userFeedback}`);
  res.status(HTTP_STATUS.NO_CONTENT).send();
}

export async function extractTextFromImageHandler(req: Request, res: Response): Promise<void> {
  const base64Image = String(req.body ?? "").trim();
  if (!base64Image) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Base64 image is required" });
    return;
  }

  if (base64Image.length < 32) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid base64 image payload" });
    return;
  }

  res.status(HTTP_STATUS.OK).json("OCR feature is currently unavailable in Node backend migration.");
}

export async function getLatestGithubCommitHandler(_req: Request, res: Response): Promise<void> {
  try {
    const response = await fetch("https://api.github.com/repos/phanxuanquang/EngAce/commits/master", {
      headers: { "User-Agent": "be-english-ai" },
    });

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const json = (await response.json()) as {
      sha?: string;
      commit?: { message?: string; author?: { date?: string } };
    };

    res.status(HTTP_STATUS.OK).json({
      ShaCode: json.sha ?? "",
      Message: String(json.commit?.message ?? "").replace(/`/g, "**"),
      Date: json.commit?.author?.date ?? new Date().toISOString(),
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: error instanceof Error ? error.message : "Failed to fetch commit",
    });
  }
}
