import sql from "mssql";
import { BaseRepository } from "./base-repository";

export interface ProgressUserRow {
  UserID: number;
  Username: string;
  FullName: string | null;
  TotalXP: number;
  TotalStudyTime: number;
  LastActiveAt: Date | null;
}

export interface ProgressSummaryRow {
  CompletedExercises: number;
  AverageScore: number;
  WeeklyXP: number;
  MonthlyXP: number;
}

export interface ProgressActivityRow {
  Id: number;
  Type: string | null;
  Topic: string | null;
  CompletedAt: Date | null;
  Score: number;
  TimeSpentMinutes: number;
}

export interface DailyProgressAggregateRow {
  DateKey: Date;
  Exercises: number;
  TimeSpentMinutes: number;
}

export class ProgressRepository extends BaseRepository {
  async getUserById(userId: number): Promise<ProgressUserRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);

    const result = await request.query<ProgressUserRow>(`
      SELECT TOP (1)
        u.id AS UserID,
        u.username AS Username,
        u.full_name AS FullName,
        u.total_xp AS TotalXP,
        u.total_study_time AS TotalStudyTime,
        u.last_active_at AS LastActiveAt
      FROM dbo.users u
      WHERE u.id = @userId
    `);

    return result.recordset[0] ?? null;
  }

  async getCompletionSummary(userId: number): Promise<ProgressSummaryRow> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);

    const result = await request.query<ProgressSummaryRow>(`
      SELECT
        COUNT(1) AS CompletedExercises,
        ISNULL(AVG(CAST(c.score AS FLOAT)), 0) AS AverageScore,
        ISNULL(SUM(CASE WHEN c.completed_at >= DATEADD(DAY, -7, SYSUTCDATETIME()) THEN CAST(c.score AS FLOAT) ELSE 0 END), 0) AS WeeklyXP,
        ISNULL(SUM(CASE WHEN c.completed_at >= DATEADD(DAY, -30, SYSUTCDATETIME()) THEN CAST(c.score AS FLOAT) ELSE 0 END), 0) AS MonthlyXP
      FROM dbo.exercise_completions c
      WHERE c.user_id = @userId
        AND c.is_completed = 1
    `);

    return result.recordset[0] ?? {
      CompletedExercises: 0,
      AverageScore: 0,
      WeeklyXP: 0,
      MonthlyXP: 0,
    };
  }

  async countTotalExercises(): Promise<number> {
    const request = await this.createRequest();
    const result = await request.query<{ TotalExercises: number }>(`
      SELECT COUNT(1) AS TotalExercises
      FROM dbo.exercises
      WHERE is_active = 1
    `);

    return result.recordset[0]?.TotalExercises ?? 0;
  }

  async getRecentActivities(userId: number, limit: number): Promise<ProgressActivityRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);
    this.bindInput(request, "limit", sql.Int, limit);

    const result = await request.query<ProgressActivityRow>(`
      SELECT TOP (@limit)
        c.id AS Id,
        e.type AS Type,
        e.title AS Topic,
        c.completed_at AS CompletedAt,
        CAST(c.score AS FLOAT) AS Score,
        ISNULL(c.time_spent_minutes, 0) AS TimeSpentMinutes
      FROM dbo.exercise_completions c
      LEFT JOIN dbo.exercises e ON e.id = c.exercise_id
      WHERE c.user_id = @userId
        AND c.is_completed = 1
      ORDER BY c.completed_at DESC
    `);

    return result.recordset;
  }

  async getDailyProgressLastDays(userId: number, days: number): Promise<DailyProgressAggregateRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);
    this.bindInput(request, "days", sql.Int, days);

    const result = await request.query<DailyProgressAggregateRow>(`
      SELECT
        CAST(c.completed_at AS DATE) AS DateKey,
        COUNT(1) AS Exercises,
        ISNULL(SUM(c.time_spent_minutes), 0) AS TimeSpentMinutes
      FROM dbo.exercise_completions c
      WHERE c.user_id = @userId
        AND c.is_completed = 1
        AND c.completed_at >= DATEADD(DAY, -@days + 1, CAST(SYSUTCDATETIME() AS DATE))
      GROUP BY CAST(c.completed_at AS DATE)
      ORDER BY DateKey ASC
    `);

    return result.recordset;
  }
}

export const progressRepository = new ProgressRepository();
