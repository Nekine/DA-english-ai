import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import { getLeaderboard, getLeaderboardUserRank, getLeaderboardWithMeta } from "../../services/leaderboard-service";

export async function getLeaderboardHandler(req: Request, res: Response): Promise<void> {
  const limit = Number(req.query.limit ?? 50);
  const timeFilter = typeof req.query.timeFilter === "string" ? req.query.timeFilter : undefined;
  const skill = typeof req.query.skill === "string" ? req.query.skill : undefined;
  const includeMeta = req.query.includeMeta === "1" || req.query.includeMeta === "true";

  if (includeMeta) {
    const response = await getLeaderboardWithMeta({
      limit,
      ...(timeFilter ? { timeFilter } : {}),
      ...(skill ? { skill } : {}),
    });

    res.status(HTTP_STATUS.OK).json(response);
    return;
  }

  const result = await getLeaderboard({
    limit,
    ...(timeFilter ? { timeFilter } : {}),
    ...(skill ? { skill } : {}),
  });

  res.status(HTTP_STATUS.OK).json(result);
}

export async function searchLeaderboardHandler(req: Request, res: Response): Promise<void> {
  const query = String(req.query.q ?? "").trim();
  const result = await getLeaderboard({
    limit: 50,
    ...(query ? { search: query } : {}),
  });

  res.status(HTTP_STATUS.OK).json(result);
}

export async function getLeaderboardUserRankHandler(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid user id" });
    return;
  }

  const rank = await getLeaderboardUserRank(userId);
  if (!rank) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "User rank not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(rank);
}
