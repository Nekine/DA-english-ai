import { progressRepository } from "../database/repositories/progress-repository";

function toIso(value: Date | null): string {
  return value ? value.toISOString() : new Date().toISOString();
}

function levelByXp(totalXp: number): number {
  return Math.max(1, Math.floor(totalXp / 1000) + 1);
}

export async function getProgressStats(userId: number) {
  const user = await progressRepository.getUserById(userId);
  if (!user) {
    return null;
  }

  const summary = await progressRepository.getCompletionSummary(userId);
  const totalExercises = await progressRepository.countTotalExercises();
  const levelNumber = levelByXp(Number(user.TotalXP) || 0);

  return {
    completedExercises: Number(summary.CompletedExercises) || 0,
    totalExercises,
    averageScore: Math.round(Number(summary.AverageScore) || 0),
    totalStudyTime: Number(user.TotalStudyTime) || 0,
    currentStreak: 0,
    longestStreak: 0,
    level: `Level ${levelNumber}`,
    experiencePoints: Number(user.TotalXP) || 0,
    nextLevelXP: levelNumber * 1000,
    lastActiveDate: toIso(user.LastActiveAt),
  };
}

export async function getProgressActivities(userId: number, limit: number) {
  const rows = await progressRepository.getRecentActivities(userId, limit);

  return rows.map((row) => ({
    id: row.Id,
    date: toIso(row.CompletedAt),
    type: row.Type ?? "Exercise",
    topic: row.Topic ?? "Reading Exercise",
    score: Math.round(Number(row.Score) || 0),
    duration: Number(row.TimeSpentMinutes) || 0,
  }));
}

export async function getWeeklyProgress(userId: number) {
  const days = 7;
  const rows = await progressRepository.getDailyProgressLastDays(userId, days);
  const byDate = new Map<string, { exercises: number; time: number }>();

  for (const row of rows) {
    const key = new Date(row.DateKey).toISOString().slice(0, 10);
    byDate.set(key, {
      exercises: Number(row.Exercises) || 0,
      time: Number(row.TimeSpentMinutes) || 0,
    });
  }

  const result: Array<{ day: string; exercises: number; time: number }> = [];
  const today = new Date();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    const item = byDate.get(key);

    result.push({
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      exercises: item?.exercises ?? 0,
      time: item?.time ?? 0,
    });
  }

  return result;
}

export async function getUserStatsCompatibility(userId: number) {
  const user = await progressRepository.getUserById(userId);
  if (!user) {
    return null;
  }

  const summary = await progressRepository.getCompletionSummary(userId);
  const level = levelByXp(Number(user.TotalXP) || 0);

  return {
    id: String(user.UserID),
    userId: String(user.UserID),
    username: user.Username,
    fullName: user.FullName ?? user.Username,
    level,
    totalXp: Number(user.TotalXP) || 0,
    weeklyXp: Math.round(Number(summary.WeeklyXP) || 0),
    monthlyXp: Math.round(Number(summary.MonthlyXP) || 0),
    streakDays: 0,
    lastActivity: toIso(user.LastActiveAt),
    exercisesCompleted: Number(summary.CompletedExercises) || 0,
    lessonsCompleted: 0,
    wordsLearned: 0,
    readingScore: Math.round(Number(summary.AverageScore) || 0),
    listeningScore: 0,
    grammarScore: Math.round(Number(summary.AverageScore) || 0),
    vocabularyScore: Math.round(Number(summary.AverageScore) || 0),
    achievements: [],
    updatedAt: new Date().toISOString(),
    rank: 0,
    weeklyRank: 0,
    monthlyRank: 0,
  };
}

export async function getUserProgressCompatibility(userId: number) {
  const user = await progressRepository.getUserById(userId);
  if (!user) {
    return null;
  }

  const summary = await progressRepository.getCompletionSummary(userId);
  const totalXp = Number(user.TotalXP) || 0;
  const level = levelByXp(totalXp);
  const currentXp = totalXp % 1000;

  return {
    userId: String(user.UserID),
    currentLevel: level,
    currentXp,
    xpToNextLevel: Math.max(0, 1000 - currentXp),
    progressPercentage: Math.round((currentXp / 1000) * 100),
    weeklyGoal: 700,
    weeklyProgress: Math.round(Number(summary.WeeklyXP) || 0),
    monthlyGoal: 3000,
    monthlyProgress: Math.round(Number(summary.MonthlyXP) || 0),
    streakDays: 0,
    exercisesThisWeek: Math.round((Number(summary.WeeklyXP) || 0) / 100),
    lessonsThisMonth: Math.round((Number(summary.MonthlyXP) || 0) / 100),
    wordsLearnedTotal: 0,
    recentAchievements: [],
  };
}
