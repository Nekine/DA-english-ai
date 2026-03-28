import { leaderboardRepository, type LeaderboardRow } from "../database/repositories/leaderboard-repository";

function toIso(value: Date | null): string {
  return value ? value.toISOString() : new Date().toISOString();
}

function calcLevel(totalXp: number): number {
  return Math.max(1, Math.floor(totalXp / 1000) + 1);
}

function mapEntry(row: LeaderboardRow) {
  const totalXp = Number(row.TotalXP) || 0;
  const rank = Number(row.Rank) || 0;

  return {
    rank,
    userId: row.UserID,
    id: String(row.UserID),
    username: row.Username,
    totalScore: totalXp,
    totalXp,
    listening: 0,
    speaking: 0,
    reading: 0,
    writing: 0,
    exams: Number(row.ExercisesCompleted) || 0,
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
  const limitRaw = Number(input.limit ?? 50);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

  const rows = await leaderboardRepository.getLeaderboard({
    limit,
    ...(input.timeFilter ? { timeFilter: input.timeFilter } : {}),
    ...(input.search ? { search: input.search } : {}),
  });

  return rows.map(mapEntry);
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
