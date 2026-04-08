import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import {
  createTestExam,
  getTestExamById,
  getTestExamSuggestedTopics,
  listTestExams,
} from "../../services/test-exam-service";

function getAuthenticatedTaiKhoanId(req: Request): number {
  return Number(req.auth?.sub ?? 0);
}

function parseSelectedParts(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const parsed = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 1 && item <= 7);

  if (parsed.length === 0) {
    return undefined;
  }

  return Array.from(new Set(parsed));
}

export async function getTestExamListHandler(req: Request, res: Response): Promise<void> {
  const requestedByTaiKhoanId = getAuthenticatedTaiKhoanId(req);
  if (!Number.isInteger(requestedByTaiKhoanId) || requestedByTaiKhoanId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: "Invalid or missing token" });
    return;
  }

  const result = await listTestExams(requestedByTaiKhoanId);
  res.status(HTTP_STATUS.OK).json(result);
}

export function getTestExamSuggestedTopicsHandler(_req: Request, res: Response): void {
  res.status(HTTP_STATUS.OK).json(getTestExamSuggestedTopics());
}

export async function getTestExamDetailHandler(req: Request, res: Response): Promise<void> {
  const requestedByTaiKhoanId = getAuthenticatedTaiKhoanId(req);
  if (!Number.isInteger(requestedByTaiKhoanId) || requestedByTaiKhoanId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: "Invalid or missing token" });
    return;
  }

  const testId = String(req.params.testId ?? "").trim();
  if (!testId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Test ID is required" });
    return;
  }

  const detail = await getTestExamById({
    requestedByTaiKhoanId,
    testId,
  });
  if (!detail) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy đề thi" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(detail);
}

export async function createTestExamHandler(req: Request, res: Response): Promise<void> {
  const requestedByTaiKhoanId = getAuthenticatedTaiKhoanId(req);
  if (!Number.isInteger(requestedByTaiKhoanId) || requestedByTaiKhoanId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: "Invalid or missing token" });
    return;
  }

  const body = req.body as {
    Topic?: string;
    SuggestedTopic?: string;
    IsRealExamMode?: boolean;
    IsFullTest?: boolean;
    SelectedParts?: number[];
  };

  const customTopic = typeof body?.Topic === "string" ? body.Topic.trim() : "";
  const suggestedTopic = typeof body?.SuggestedTopic === "string" ? body.SuggestedTopic.trim() : "";
  const topic = customTopic || suggestedTopic || undefined;
  const selectedParts = parseSelectedParts(body?.SelectedParts);

  const created = await createTestExam({
    requestedByTaiKhoanId,
    ...(topic ? { topic } : {}),
    isRealExamMode: Boolean(body?.IsRealExamMode),
    isFullTest: body?.IsFullTest !== false,
    ...(selectedParts ? { selectedParts } : {}),
  });

  res.status(HTTP_STATUS.CREATED).json(created);
}
