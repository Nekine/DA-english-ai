import sql from "mssql";
import { BaseRepository } from "./base-repository";

export interface DashboardStatisticsRow {
  totalUsers: number;
  totalExercises: number;
  totalQuestions: number;
  totalSubmissions: number;
  activeUsersToday: number;
  activeUsersThisWeek: number;
  exercisesCreatedThisWeek: number;
  aiGeneratedExercises: number;
  averageScore: number;
  averageCompletionTime: number;
}

export interface TopUserRow {
  UserId: string;
  Username: string;
  FullName: string;
  Email: string;
  TotalExercises: number;
  AverageScore: number;
  TotalXP: number;
  WeeklyXP: number;
  LastActivity: Date | null;
  Status: string;
}

export interface ExerciseRow {
  ExerciseId: number;
  ExerciseName: string;
}

export interface ExerciseCompletionAnalyticsRow {
  UserId: number;
  Score: number;
  StartedAt: Date | null;
  CompletedAt: Date | null;
}

export type ExerciseBulkOperation = "delete" | "activate" | "deactivate";

export class AdminRepository extends BaseRepository {
  private buildIdsJson(ids: number[]): string {
    return JSON.stringify(ids);
  }

  async getDashboardStatistics(): Promise<DashboardStatisticsRow> {
    const request = await this.createRequest();

    const result = await request.query<DashboardStatisticsRow>(`
      WITH summary AS (
        SELECT
          (SELECT COUNT(1) FROM dbo.users) AS totalUsers,
          (SELECT COUNT(1) FROM dbo.exercises) AS totalExercises,
          (
            SELECT COUNT(1)
            FROM dbo.exercises e
            CROSS APPLY OPENJSON(e.questions_json)
          ) AS totalQuestions,
          (SELECT COUNT(1) FROM dbo.exercise_completions) AS totalSubmissions,
          (
            SELECT COUNT(DISTINCT c.user_id)
            FROM dbo.exercise_completions c
            WHERE c.completed_at IS NOT NULL
              AND CAST(c.completed_at AS DATE) = CAST(SYSUTCDATETIME() AS DATE)
          ) AS activeUsersToday,
          (
            SELECT COUNT(DISTINCT c.user_id)
            FROM dbo.exercise_completions c
            WHERE c.completed_at IS NOT NULL
              AND c.completed_at >= DATEADD(DAY, -DATEPART(WEEKDAY, SYSUTCDATETIME()) + 1, CAST(SYSUTCDATETIME() AS DATE))
          ) AS activeUsersThisWeek,
          (
            SELECT COUNT(1)
            FROM dbo.exercises e
            WHERE e.created_at >= DATEADD(DAY, -DATEPART(WEEKDAY, SYSUTCDATETIME()) + 1, CAST(SYSUTCDATETIME() AS DATE))
          ) AS exercisesCreatedThisWeek,
          (
            SELECT COUNT(1)
            FROM dbo.exercises e
            WHERE LOWER(ISNULL(e.type, N'')) LIKE N'%ai%'
               OR LOWER(ISNULL(e.category, N'')) LIKE N'%ai%'
          ) AS aiGeneratedExercises,
          (
            SELECT ISNULL(AVG(CAST(c.score AS FLOAT)), 0)
            FROM dbo.exercise_completions c
            WHERE c.is_completed = 1
          ) AS averageScore,
          (
            SELECT ISNULL(AVG(DATEDIFF(MINUTE, c.started_at, c.completed_at)), 0)
            FROM dbo.exercise_completions c
            WHERE c.is_completed = 1
              AND c.started_at IS NOT NULL
              AND c.completed_at IS NOT NULL
          ) AS averageCompletionTime
      )
      SELECT TOP (1)
        totalUsers,
        totalExercises,
        totalQuestions,
        totalSubmissions,
        activeUsersToday,
        activeUsersThisWeek,
        exercisesCreatedThisWeek,
        aiGeneratedExercises,
        averageScore,
        averageCompletionTime
      FROM summary
    `);

    return (
      result.recordset[0] ?? {
        totalUsers: 0,
        totalExercises: 0,
        totalQuestions: 0,
        totalSubmissions: 0,
        activeUsersToday: 0,
        activeUsersThisWeek: 0,
        exercisesCreatedThisWeek: 0,
        aiGeneratedExercises: 0,
        averageScore: 0,
        averageCompletionTime: 0,
      }
    );
  }

  async getTopUsers(): Promise<TopUserRow[]> {
    const request = await this.createRequest();

    const result = await request.query<TopUserRow>(`
      WITH completion_agg AS (
        SELECT
          c.user_id,
          COUNT(1) AS totalExercises,
          ISNULL(AVG(CAST(c.score AS FLOAT)), 0) AS averageScore,
          ISNULL(SUM(CASE
            WHEN c.completed_at >= DATEADD(DAY, -DATEPART(WEEKDAY, SYSUTCDATETIME()) + 1, CAST(SYSUTCDATETIME() AS DATE))
              THEN CAST(c.score AS INT)
            ELSE 0
          END), 0) AS weeklyXP,
          MAX(c.completed_at) AS lastActivity
        FROM dbo.exercise_completions c
        WHERE c.is_completed = 1
        GROUP BY c.user_id
      )
      SELECT TOP (10)
        CAST(u.id AS NVARCHAR(20)) AS UserId,
        u.username AS Username,
        ISNULL(u.full_name, N'') AS FullName,
        u.email AS Email,
        ISNULL(a.totalExercises, 0) AS TotalExercises,
        ISNULL(a.averageScore, 0) AS AverageScore,
        u.total_xp AS TotalXP,
        ISNULL(a.weeklyXP, 0) AS WeeklyXP,
        a.lastActivity AS LastActivity,
        CASE WHEN u.status = N'active' THEN N'Active' ELSE N'Inactive' END AS Status
      FROM dbo.users u
      LEFT JOIN completion_agg a ON a.user_id = u.id
      WHERE u.status = N'active' OR u.status IS NULL
      ORDER BY u.total_xp DESC
    `);

    return result.recordset;
  }

  async getExerciseById(exerciseId: number): Promise<ExerciseRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "exerciseId", sql.Int, exerciseId);

    const result = await request.query<ExerciseRow>(`
      SELECT TOP (1)
        e.id AS ExerciseId,
        e.title AS ExerciseName
      FROM dbo.exercises e
      WHERE e.id = @exerciseId
    `);

    return result.recordset[0] ?? null;
  }

  async getExerciseCompletionsForAnalytics(
    exerciseId: number,
  ): Promise<ExerciseCompletionAnalyticsRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "exerciseId", sql.Int, exerciseId);

    const result = await request.query<ExerciseCompletionAnalyticsRow>(`
      SELECT
        c.user_id AS UserId,
        CAST(c.score AS FLOAT) AS Score,
        c.started_at AS StartedAt,
        c.completed_at AS CompletedAt
      FROM dbo.exercise_completions c
      WHERE c.exercise_id = @exerciseId
        AND c.is_completed = 1
    `);

    return result.recordset;
  }

  async countExercisesByIds(exerciseIds: number[]): Promise<number> {
    const request = await this.createRequest();
    this.bindInput(request, "exerciseIdsJson", sql.NVarChar(sql.MAX), this.buildIdsJson(exerciseIds));

    const result = await request.query<{ totalCount: number }>(`
      SELECT COUNT(1) AS totalCount
      FROM dbo.exercises e
      WHERE e.id IN (
        SELECT TRY_CAST([value] AS INT)
        FROM OPENJSON(@exerciseIdsJson)
      )
    `);

    return result.recordset[0]?.totalCount ?? 0;
  }

  async deleteExercisesByIds(exerciseIds: number[]): Promise<number> {
    const request = await this.createRequest();
    this.bindInput(request, "exerciseIdsJson", sql.NVarChar(sql.MAX), this.buildIdsJson(exerciseIds));

    const result = await request.query(`
      DELETE FROM dbo.exercises
      WHERE id IN (
        SELECT TRY_CAST([value] AS INT)
        FROM OPENJSON(@exerciseIdsJson)
      )
    `);

    return result.rowsAffected[0] ?? 0;
  }

  async setExercisesActiveByIds(exerciseIds: number[], isActive: boolean): Promise<number> {
    const request = await this.createRequest();
    this.bindInput(request, "exerciseIdsJson", sql.NVarChar(sql.MAX), this.buildIdsJson(exerciseIds));
    this.bindInput(request, "isActive", sql.Bit, isActive);

    const result = await request.query(`
      UPDATE dbo.exercises
      SET is_active = @isActive,
          updated_at = SYSUTCDATETIME()
      WHERE id IN (
        SELECT TRY_CAST([value] AS INT)
        FROM OPENJSON(@exerciseIdsJson)
      )
    `);

    return result.rowsAffected[0] ?? 0;
  }
}
