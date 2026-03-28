import sql from "mssql";
import { BaseRepository } from "./base-repository";

export interface AiReviewStatsRow {
  TotalPending: number;
  TotalApproved: number;
  TotalRejected: number;
  LowConfidence: number;
  AvgConfidence: number;
  NeedsAttention: number;
}

export interface AiReviewSubmissionRow {
  Id: number;
  ExerciseId: number;
  ExerciseTitle: string;
  ExerciseCode: string;
  ExerciseLevel: string;
  ExerciseType: string;
  CreatedBy: number | null;
  CreatedAt: Date;
  SourceType: string | null;
  TotalQuestions: number;
  ReviewStatus: "pending" | "approved" | "rejected" | "needs_regrade";
  UserId: number;
  UserName: string;
  UserEmail: string;
  OriginalScore: number;
  FinalScore: number;
  CompletedAt: Date | null;
  ReviewNotes: string | null;
  ConfidenceScore: number;
}

export interface AiReviewDetailRow {
  Id: number;
  ExerciseId: number;
  ExerciseTitle: string;
  QuestionsJson: string;
  CorrectAnswersJson: string;
  UserAnswersJson: string;
  Level: string;
  Type: string;
  Category: string;
}

export class AiReviewRepository extends BaseRepository {
  async getStats(): Promise<AiReviewStatsRow> {
    const request = await this.createRequest();

    const result = await request.query<AiReviewStatsRow>(`
      SELECT
        COUNT(1) AS TotalPending,
        0 AS TotalApproved,
        0 AS TotalRejected,
        SUM(CASE WHEN CAST(c.score AS FLOAT) < 70 THEN 1 ELSE 0 END) AS LowConfidence,
        ISNULL(AVG(CAST(c.score AS FLOAT)) / 100.0, 0) AS AvgConfidence,
        SUM(CASE WHEN CAST(c.score AS FLOAT) < 70 THEN 1 ELSE 0 END) AS NeedsAttention
      FROM dbo.exercise_completions c
      JOIN dbo.exercises e ON e.id = c.exercise_id
      WHERE c.is_completed = 1
        AND ISNULL(e.source_type, N'') IN (N'ai', N'ai_generated')
    `);

    return result.recordset[0] ?? {
      TotalPending: 0,
      TotalApproved: 0,
      TotalRejected: 0,
      LowConfidence: 0,
      AvgConfidence: 0,
      NeedsAttention: 0,
    };
  }

  async getSubmissions(filters: {
    status?: string;
    confidenceFilter?: string;
    search?: string;
  }): Promise<AiReviewSubmissionRow[]> {
    const request = await this.createRequest();
    const whereParts: string[] = [
      "c.is_completed = 1",
      "ISNULL(e.source_type, N'') IN (N'ai', N'ai_generated')",
    ];

    if (filters.search) {
      whereParts.push("(e.title LIKE @search OR ISNULL(e.category, N'') LIKE @search OR ISNULL(e.level, N'') LIKE @search)");
      this.bindInput(request, "search", sql.NVarChar(255), `%${filters.search}%`);
    }

    if (filters.confidenceFilter === "low") {
      whereParts.push("CAST(c.score AS FLOAT) < 70");
    } else if (filters.confidenceFilter === "high") {
      whereParts.push("CAST(c.score AS FLOAT) >= 70");
    }

    if (filters.status && filters.status !== "all") {
      if (filters.status === "pending") {
        whereParts.push("1 = 1");
      } else {
        whereParts.push("1 = 0");
      }
    }

    const result = await request.query<AiReviewSubmissionRow>(`
      SELECT TOP (100)
        c.id AS Id,
        e.id AS ExerciseId,
        e.title AS ExerciseTitle,
        ISNULL(e.category, N'general') AS ExerciseCode,
        ISNULL(e.level, N'A1') AS ExerciseLevel,
        ISNULL(e.type, N'quiz') AS ExerciseType,
        e.created_by AS CreatedBy,
        e.created_at AS CreatedAt,
        e.source_type AS SourceType,
        0 AS TotalQuestions,
        CAST(N'pending' AS NVARCHAR(20)) AS ReviewStatus,
        u.id AS UserId,
        u.username AS UserName,
        u.email AS UserEmail,
        CAST(c.score AS FLOAT) AS OriginalScore,
        CAST(c.score AS FLOAT) AS FinalScore,
        c.completed_at AS CompletedAt,
        CAST(NULL AS NVARCHAR(MAX)) AS ReviewNotes,
        CAST(c.score AS FLOAT) / 100.0 AS ConfidenceScore
      FROM dbo.exercise_completions c
      JOIN dbo.exercises e ON e.id = c.exercise_id
      JOIN dbo.users u ON u.id = c.user_id
      WHERE ${whereParts.join(" AND ")}
      ORDER BY c.completed_at DESC
    `);

    return result.recordset;
  }

  async getSubmissionDetails(id: number): Promise<AiReviewDetailRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "id", sql.Int, id);

    const result = await request.query<AiReviewDetailRow>(`
      SELECT TOP (1)
        c.id AS Id,
        e.id AS ExerciseId,
        e.title AS ExerciseTitle,
        ISNULL(e.questions_json, N'[]') AS QuestionsJson,
        ISNULL(e.correct_answers_json, N'[]') AS CorrectAnswersJson,
        ISNULL(c.user_answers_json, N'[]') AS UserAnswersJson,
        ISNULL(e.level, N'A1') AS Level,
        ISNULL(e.type, N'quiz') AS Type,
        ISNULL(e.category, N'general') AS Category
      FROM dbo.exercise_completions c
      JOIN dbo.exercises e ON e.id = c.exercise_id
      WHERE c.id = @id
        AND c.is_completed = 1
        AND ISNULL(e.source_type, N'') IN (N'ai', N'ai_generated')
    `);

    return result.recordset[0] ?? null;
  }

  async updateReview(id: number, finalScore: number): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "id", sql.Int, id);
    this.bindInput(request, "finalScore", sql.Decimal(5, 2), finalScore);

    const result = await request.query(`
      UPDATE dbo.exercise_completions
      SET score = @finalScore,
          completed_at = ISNULL(completed_at, SYSUTCDATETIME())
      WHERE id = @id
    `);

    return (result.rowsAffected[0] ?? 0) > 0;
  }
}

export const aiReviewRepository = new AiReviewRepository();
