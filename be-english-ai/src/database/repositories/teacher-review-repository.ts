import sql from "mssql";
import { BaseRepository } from "./base-repository";

export interface TeacherReviewRow {
  completionId: number;
  exerciseId: number;
  exerciseTitle: string;
  exerciseType: string | null;
  exerciseCategory: string | null;
  originalScore: number | null;
  finalScore: number | null;
  reviewStatus: "approved" | "rejected" | "needs_regrade";
  reviewNotes: string | null;
  reviewedAt: Date | null;
  completedAt: Date | null;
  confidenceScore: number | null;
  reviewerName: string;
  reviewerEmail: string | null;
}

export interface TeacherReviewDetailRow extends TeacherReviewRow {
  userAnswersJson: string | null;
  questionsJson: string | null;
  correctAnswersJson: string | null;
}

export class TeacherReviewRepository extends BaseRepository {
  async getMyReviews(userId: number): Promise<TeacherReviewRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);

    const result = await request.query<TeacherReviewRow>(`
      SELECT TOP (100)
        c.id AS completionId,
        c.exercise_id AS exerciseId,
        e.title AS exerciseTitle,
        e.type AS exerciseType,
        e.category AS exerciseCategory,
        CAST(c.score AS FLOAT) AS originalScore,
        CAST(c.score AS FLOAT) AS finalScore,
        CAST(N'approved' AS NVARCHAR(20)) AS reviewStatus,
        CAST(NULL AS NVARCHAR(MAX)) AS reviewNotes,
        c.completed_at AS reviewedAt,
        c.completed_at AS completedAt,
        CAST(NULL AS FLOAT) AS confidenceScore,
        CAST(N'Unknown' AS NVARCHAR(100)) AS reviewerName,
        CAST(NULL AS NVARCHAR(255)) AS reviewerEmail
      FROM dbo.exercise_completions c
      JOIN dbo.exercises e ON e.id = c.exercise_id
      WHERE c.user_id = @userId
        AND c.is_completed = 1
      ORDER BY c.completed_at DESC
    `);

    return result.recordset;
  }

  async getReviewDetail(completionId: number, userId: number): Promise<TeacherReviewDetailRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "completionId", sql.Int, completionId);
    this.bindInput(request, "userId", sql.Int, userId);

    const result = await request.query<TeacherReviewDetailRow>(`
      SELECT TOP (1)
        c.id AS completionId,
        c.exercise_id AS exerciseId,
        e.title AS exerciseTitle,
        e.type AS exerciseType,
        e.category AS exerciseCategory,
        c.user_answers_json AS userAnswersJson,
        e.questions_json AS questionsJson,
        e.correct_answers_json AS correctAnswersJson,
        CAST(c.score AS FLOAT) AS originalScore,
        CAST(c.score AS FLOAT) AS finalScore,
        CAST(N'approved' AS NVARCHAR(20)) AS reviewStatus,
        CAST(NULL AS NVARCHAR(MAX)) AS reviewNotes,
        c.completed_at AS reviewedAt,
        c.completed_at AS completedAt,
        CAST(NULL AS FLOAT) AS confidenceScore,
        CAST(N'Unknown' AS NVARCHAR(100)) AS reviewerName,
        CAST(NULL AS NVARCHAR(255)) AS reviewerEmail
      FROM dbo.exercise_completions c
      JOIN dbo.exercises e ON e.id = c.exercise_id
      WHERE c.id = @completionId
        AND c.user_id = @userId
    `);

    return result.recordset[0] ?? null;
  }
}

export const teacherReviewRepository = new TeacherReviewRepository();
