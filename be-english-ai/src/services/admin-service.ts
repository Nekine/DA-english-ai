import { AdminRepository } from "../database/repositories/admin-repository";

const adminRepository = new AdminRepository();

function toIsoOrNow(value: Date | null): string {
  return value ? value.toISOString() : new Date().toISOString();
}

export interface AdminContentSummaryDto {
  totalExercises: number;
  totalTests: number;
  exercisesCreated: {
    today: number;
    week: number;
    month: number;
  };
  testsCreated: {
    today: number;
    week: number;
    month: number;
  };
}

export interface AdminExerciseItemDto {
  id: number;
  title: string;
  exerciseType: string;
  partType: string;
  level: string;
  status: string;
  creatorUsername: string;
  createdAt: string;
  questionCount: number;
  attemptCount: number;
}

export interface AdminTestItemDto {
  id: number;
  title: string;
  examType: string;
  totalParts: number;
  totalQuestions: number;
  durationMinutes: number;
  status: string;
  creatorUsername: string;
  createdAt: string;
  attemptCount: number;
}

export async function getDashboard() {
  const startedAt = Date.now();

  const [statisticsRaw, topUsersRaw] = await Promise.all([
    adminRepository.getDashboardStatistics(),
    adminRepository.getTopUsers(),
  ]);

  const statistics = {
    totalUsers: statisticsRaw.totalUsers,
    activeUsers: statisticsRaw.activeUsersToday,
    activeUsersToday: statisticsRaw.activeUsersToday,
    activeUsersThisWeek: statisticsRaw.activeUsersThisWeek,
    totalExercises: statisticsRaw.totalExercises,
    totalQuestions: statisticsRaw.totalQuestions,
    totalSubmissions: statisticsRaw.totalSubmissions,
    exercisesCreatedThisWeek: statisticsRaw.exercisesCreatedThisWeek,
    aiGeneratedExercises: statisticsRaw.aiGeneratedExercises,
    averageScore: Number(statisticsRaw.averageScore || 0),
    averageCompletionTime: Number(statisticsRaw.averageCompletionTime || 0),
  };

  const topUsers = topUsersRaw.map((u) => ({
    userId: u.UserId,
    userName: u.Username,
    fullName: u.FullName,
    email: u.Email,
    totalExercises: u.TotalExercises,
    averageScore: Number(u.AverageScore || 0),
    totalXP: u.TotalXP,
    weeklyXP: u.WeeklyXP,
    lastActivity: toIsoOrNow(u.LastActivity),
    status: u.Status,
  }));

  const systemHealth = {
    databaseConnection: true,
    geminiApiConnection: true,
    responseTimeMs: Date.now() - startedAt,
    cpuUsagePercent: 0,
    memoryUsagePercent: 0,
    applicationVersion: "1.0.0",
    lastCheckTime: new Date().toISOString(),
  };

  return {
    statistics,
    topUsers,
    systemHealth,
    message: "Dashboard data (Activities temporarily disabled due to JSON serialization issues)",
  };
}

export async function getAdminContentSummary(): Promise<AdminContentSummaryDto> {
  const row = await adminRepository.getContentSummary();

  return {
    totalExercises: Number(row.totalExercises || 0),
    totalTests: Number(row.totalTests || 0),
    exercisesCreated: {
      today: Number(row.exercisesCreatedToday || 0),
      week: Number(row.exercisesCreatedWeek || 0),
      month: Number(row.exercisesCreatedMonth || 0),
    },
    testsCreated: {
      today: Number(row.testsCreatedToday || 0),
      week: Number(row.testsCreatedWeek || 0),
      month: Number(row.testsCreatedMonth || 0),
    },
  };
}

export async function listAdminExercises(): Promise<AdminExerciseItemDto[]> {
  const rows = await adminRepository.listExercisesForAdmin();

  return rows.map((row) => ({
    id: row.ExerciseId,
    title: row.Title,
    exerciseType: row.ExerciseType,
    partType: row.PartType,
    level: row.Level,
    status: row.Status,
    creatorUsername: row.CreatorUsername,
    createdAt: toIsoOrNow(row.CreatedAt),
    questionCount: Number(row.QuestionCount || 0),
    attemptCount: Number(row.AttemptCount || 0),
  }));
}

export async function listAdminTests(): Promise<AdminTestItemDto[]> {
  const rows = await adminRepository.listTestsForAdmin();

  return rows.map((row) => ({
    id: row.TestId,
    title: row.Title,
    examType: row.ExamType,
    totalParts: Number(row.TotalParts || 0),
    totalQuestions: Number(row.TotalQuestions || 0),
    durationMinutes: Number(row.DurationMinutes || 0),
    status: row.Status,
    creatorUsername: row.CreatorUsername,
    createdAt: toIsoOrNow(row.CreatedAt),
    attemptCount: Number(row.AttemptCount || 0),
  }));
}

export async function deleteAdminExercise(exerciseId: number): Promise<boolean> {
  return adminRepository.archiveExerciseById(exerciseId);
}

export async function deleteAdminTest(testId: number): Promise<boolean> {
  return adminRepository.archiveTestById(testId);
}

function safeAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, current) => sum + current, 0) / values.length;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getExerciseAnalytics(exerciseId: number) {
  const exercise = await adminRepository.getExerciseById(exerciseId);
  if (!exercise) {
    return null;
  }

  const completedRows = await adminRepository.getExerciseCompletionsForAnalytics(exerciseId);

  if (completedRows.length === 0) {
    return {
      ExerciseId: exercise.ExerciseId,
      ExerciseName: exercise.ExerciseName,
      TotalAttempts: 0,
      UniqueUsers: 0,
      AverageScore: 0,
      MinScore: 0,
      MaxScore: 0,
      AverageCompletionTime: 0,
      ScoreDistribution: [],
      DailyAttempts: [],
      QuestionAnalytics: [],
    };
  }

  const scores = completedRows.map((row) => row.Score);

  const ranges = [
    { label: "0-20", predicate: (score: number) => score <= 20 },
    { label: "21-40", predicate: (score: number) => score > 20 && score <= 40 },
    { label: "41-60", predicate: (score: number) => score > 40 && score <= 60 },
    { label: "61-80", predicate: (score: number) => score > 60 && score <= 80 },
    { label: "81-100", predicate: (score: number) => score > 80 },
  ];

  const scoreDistribution = ranges.map((range) => {
    const count = scores.filter(range.predicate).length;
    const percentage = scores.length > 0 ? (count / scores.length) * 100 : 0;

    return {
      ScoreRange: range.label,
      Count: count,
      Percentage: percentage,
    };
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyMap = new Map<string, { attempts: number; userIds: Set<number>; scores: number[] }>();

  for (const row of completedRows) {
    if (!row.CompletedAt || row.CompletedAt < thirtyDaysAgo) {
      continue;
    }

    const key = toDateKey(row.CompletedAt);
    const existing = dailyMap.get(key);

    if (existing) {
      existing.attempts += 1;
      existing.userIds.add(row.UserId);
      existing.scores.push(row.Score);
      continue;
    }

    dailyMap.set(key, {
      attempts: 1,
      userIds: new Set([row.UserId]),
      scores: [row.Score],
    });
  }

  const dailyAttempts = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      Date: new Date(`${date}T00:00:00.000Z`).toISOString(),
      AttemptCount: value.attempts,
      UniqueUsers: value.userIds.size,
      AverageScore: safeAverage(value.scores),
    }));

  const completionMinutes = completedRows
    .filter((row) => row.CompletedAt && row.StartedAt)
    .map((row) => {
      const end = row.CompletedAt as Date;
      const start = row.StartedAt as Date;
      return Math.max(0, (end.getTime() - start.getTime()) / 60000);
    });

  return {
    ExerciseId: exercise.ExerciseId,
    ExerciseName: exercise.ExerciseName,
    TotalAttempts: completedRows.length,
    UniqueUsers: new Set(completedRows.map((row) => row.UserId)).size,
    AverageScore: safeAverage(scores),
    MinScore: Math.min(...scores),
    MaxScore: Math.max(...scores),
    AverageCompletionTime: safeAverage(completionMinutes),
    ScoreDistribution: scoreDistribution,
    DailyAttempts: dailyAttempts,
    QuestionAnalytics: [],
  };
}

export async function bulkOperationExercises(input: {
  exerciseIds: number[];
  operation: "delete" | "activate" | "deactivate";
}) {
  const matchedCount = await adminRepository.countExercisesByIds(input.exerciseIds);
  if (matchedCount <= 0) {
    return {
      statusCode: 400,
      message: "No exercises found with provided IDs",
    } as const;
  }

  if (input.operation === "delete") {
    await adminRepository.deleteExercisesByIds(input.exerciseIds);
  } else if (input.operation === "activate") {
    await adminRepository.setExercisesActiveByIds(input.exerciseIds, true);
  } else if (input.operation === "deactivate") {
    await adminRepository.setExercisesActiveByIds(input.exerciseIds, false);
  } else {
    return {
      statusCode: 400,
      message: "Invalid operation",
    } as const;
  }

  return {
    statusCode: 200,
    message: `Successfully performed ${input.operation} on ${matchedCount} exercises`,
  } as const;
}
