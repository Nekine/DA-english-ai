import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import {
  getLearningProfileByTaiKhoanId,
  refreshLearningProfileByTaiKhoanId,
} from "../../services/learning-insights-service";

function getAuthenticatedTaiKhoanId(req: Request): number {
  return Number(req.auth?.sub ?? 0);
}

export async function getLearningProfileHandler(req: Request, res: Response): Promise<void> {
  const requestedByTaiKhoanId = getAuthenticatedTaiKhoanId(req);
  if (!Number.isInteger(requestedByTaiKhoanId) || requestedByTaiKhoanId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: "Invalid or missing token" });
    return;
  }

  const profile = await getLearningProfileByTaiKhoanId(requestedByTaiKhoanId);
  if (!profile) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "User not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json({ success: true, data: profile });
}

export async function refreshLearningProfileHandler(req: Request, res: Response): Promise<void> {
  const requestedByTaiKhoanId = getAuthenticatedTaiKhoanId(req);
  if (!Number.isInteger(requestedByTaiKhoanId) || requestedByTaiKhoanId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: "Invalid or missing token" });
    return;
  }

  const profile = await refreshLearningProfileByTaiKhoanId(requestedByTaiKhoanId);
  if (!profile) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "User not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json({ success: true, message: "Learning profile refreshed", data: profile });
}
