import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import {
  getProgressActivities,
  getProgressOverviewByTaiKhoanId,
  getProgressStats,
  getUserProgressCompatibility,
  getUserStatsCompatibility,
  getWeeklyProgress,
} from "../../services/progress-service";

function getAuthenticatedTaiKhoanId(req: Request): number {
  return Number(req.auth?.sub ?? 0);
}

export async function getProgressOverviewHandler(req: Request, res: Response): Promise<void> {
  const taiKhoanId = getAuthenticatedTaiKhoanId(req);
  if (!Number.isInteger(taiKhoanId) || taiKhoanId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: "Invalid or missing token" });
    return;
  }

  const rawDays = Number(req.query.days ?? 7);
  const requestedDays = Number.isFinite(rawDays) ? Math.trunc(rawDays) : 7;
  const days = Math.min(Math.max(requestedDays, 1), 30);

  const data = await getProgressOverviewByTaiKhoanId(taiKhoanId, { days });
  if (!data) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Progress data not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(data);
}

export async function getProgressStatsHandler(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid user id" });
    return;
  }

  const data = await getProgressStats(userId);
  if (!data) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "User stats not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(data);
}

export async function getProgressActivitiesHandler(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid user id" });
    return;
  }

  const limitRaw = Number(req.query.limit ?? 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 10;

  const data = await getProgressActivities(userId, limit);
  res.status(HTTP_STATUS.OK).json(data);
}

export async function getWeeklyProgressHandler(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid user id" });
    return;
  }

  const data = await getWeeklyProgress(userId);
  res.status(HTTP_STATUS.OK).json(data);
}

export async function getUserStatsCompatibilityHandler(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid user id" });
    return;
  }

  const data = await getUserStatsCompatibility(userId);
  if (!data) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "User stats not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(data);
}

export async function getUserProgressCompatibilityHandler(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid user id" });
    return;
  }

  const data = await getUserProgressCompatibility(userId);
  if (!data) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "User progress not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(data);
}
