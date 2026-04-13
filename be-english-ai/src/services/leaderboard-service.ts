import { leaderboardRepository, type LeaderboardRow } from "../database/repositories/leaderboard-repository";
import { appConfig } from "../config";
import { logger } from "../utils/logger";

function toIso(value: Date | null): string {
  return value ? value.toISOString() : new Date().toISOString();
}

function calcLevel(totalXp: number): number {
  return Math.max(1, Math.floor(totalXp / 1000) + 1);
}

function normalizeTimeFilter(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value === "weekly") {
    return "week";
  }

  if (value === "monthly") {
    return "month";
  }

  return value;
}

function normalizeLimit(value?: number): number {
  const limitRaw = Number(value ?? 50);
  return Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
}

function mapEntry(row: LeaderboardRow) {
  const totalXp = Number(row.TotalXP) || 0;
  const rank = Number(row.Rank) || 0;
  const exercises = Number(row.ExercisesCompleted) || 0;
  const exams = Number(row.ExamsCompleted) || 0;
  const totalAssignmentsAndExams = Number(row.TotalAssignmentsAndExams) || (exercises + exams);
  const attendanceStars = Number(row.AttendanceStars) || 0;

  return {
    rank,
    userId: row.UserID,
    id: String(row.UserID),
    username: row.Username,
    totalScore: totalXp,
    totalXp,
    attendanceStars,
    listening: 0,
    speaking: 0,
    reading: 0,
    writing: 0,
    exercises,
    exams,
    totalAssignmentsAndExams,
    lastUpdate: toIso(row.LastActiveAt),
    level: calcLevel(totalXp),
    weeklyXp: 0,
    monthlyXp: 0,
    weeklyRank: rank,
    monthlyRank: rank,
    streakDays: 0,
    ...(row.Avatar ? { avatar: row.Avatar } : {}),
    ...(row.FullName ? { fullName: row.FullName } : {}),
  };
}

export async function getLeaderboard(input: {
  limit?: number;
  timeFilter?: string;
  skill?: string;
  search?: string;
}) {
  const limit = normalizeLimit(input.limit);
  const normalizedTimeFilter = normalizeTimeFilter(input.timeFilter);

  try {
    const rows = await leaderboardRepository.getLeaderboard({
      limit,
      ...(normalizedTimeFilter ? { timeFilter: normalizedTimeFilter } : {}),
      ...(input.search ? { search: input.search } : {}),
    });

    return rows.map(mapEntry);
  } catch (error) {
    logger.error("Failed to load leaderboard", {
      message: error instanceof Error ? error.message : String(error),
      timeFilter: normalizedTimeFilter ?? "",
      limit,
    });

    if (appConfig.env !== "production") {
      return [];
    }

    throw error;
  }
}

export async function getLeaderboardWithMeta(input: {
  limit?: number;
  timeFilter?: string;
  skill?: string;
  search?: string;
}) {
  const limit = normalizeLimit(input.limit);
  const normalizedTimeFilter = normalizeTimeFilter(input.timeFilter);

  try {
    const [rows, counts] = await Promise.all([
      leaderboardRepository.getLeaderboard({
        limit,
        ...(normalizedTimeFilter ? { timeFilter: normalizedTimeFilter } : {}),
        ...(input.search ? { search: input.search } : {}),
      }),
      leaderboardRepository.getCounts({
        ...(normalizedTimeFilter ? { timeFilter: normalizedTimeFilter } : {}),
        ...(input.search ? { search: input.search } : {}),
      }),
    ]);

    return {
      users: rows.map(mapEntry),
      totalCount: counts.filteredCount,
      systemTotalUsers: counts.systemCount,
      timeFilter: normalizedTimeFilter ?? "all",
      category: "totalxp",
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Failed to load leaderboard with meta", {
      message: error instanceof Error ? error.message : String(error),
      timeFilter: normalizedTimeFilter ?? "",
      limit,
    });

    if (appConfig.env !== "production") {
      return {
        users: [],
        totalCount: 0,
        systemTotalUsers: 0,
        timeFilter: normalizedTimeFilter ?? "all",
        category: "totalxp",
        lastUpdated: new Date().toISOString(),
      };
    }

    throw error;
  }
}

export async function getLeaderboardUserRank(userId: number) {
  const rank = await leaderboardRepository.getUserRank(userId);
  if (rank == null) {
    return null;
  }

  return {
    userId,
    rank,
  };
}
