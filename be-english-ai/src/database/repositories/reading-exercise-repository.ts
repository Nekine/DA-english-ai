import sql from "mssql";
import { BaseRepository } from "./base-repository";

export interface ReadingExerciseRow {
  id: number;
  title: string;
  content: string | null;
  level: string | null;
  type: string | null;
  sourceType: string | null;
  category: string | null;
  estimatedMinutes: number | null;
  createdBy: number | null;
  description: string | null;
  questionsJson: string;
  correctAnswersJson: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReadingQuestionInput {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: number;
  explanation?: string;
}

export class ReadingExerciseRepository extends BaseRepository {
  async getAll(filters: { level?: string; type?: string; sourceType?: string }): Promise<ReadingExerciseRow[]> {
    const request = await this.createRequest();
    const whereParts: string[] = [
      "e.is_active = 1",
      "e.type IN (N'Part 5', N'Part 6', N'Part 7')",
    ];

    if (filters.level) {
      whereParts.push("e.level = @level");
      this.bindInput(request, "level", sql.NVarChar(50), filters.level);
    }
    if (filters.type) {
      whereParts.push("e.type = @type");
      this.bindInput(request, "type", sql.NVarChar(50), filters.type);
    }
    if (filters.sourceType) {
      whereParts.push("e.source_type = @sourceType");
      this.bindInput(request, "sourceType", sql.NVarChar(100), filters.sourceType);
    }

    const result = await request.query<ReadingExerciseRow>(`
      SELECT
        e.id,
        e.title,
        e.content,
        e.level,
        e.type,
        e.source_type AS sourceType,
        e.category,
        e.estimated_minutes AS estimatedMinutes,
        e.created_by AS createdBy,
        e.description,
        e.questions_json AS questionsJson,
        e.correct_answers_json AS correctAnswersJson,
        e.is_active AS isActive,
        e.created_at AS createdAt,
        e.updated_at AS updatedAt
      FROM dbo.exercises e
      WHERE ${whereParts.join(" AND ")}
      ORDER BY e.created_at DESC
    `);

    return result.recordset;
  }

  async getById(id: number): Promise<ReadingExerciseRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "id", sql.Int, id);

    const result = await request.query<ReadingExerciseRow>(`
      SELECT TOP (1)
        e.id,
        e.title,
        e.content,
        e.level,
        e.type,
        e.source_type AS sourceType,
        e.category,
        e.estimated_minutes AS estimatedMinutes,
        e.created_by AS createdBy,
        e.description,
        e.questions_json AS questionsJson,
        e.correct_answers_json AS correctAnswersJson,
        e.is_active AS isActive,
        e.created_at AS createdAt,
        e.updated_at AS updatedAt
      FROM dbo.exercises e
      WHERE e.id = @id
    `);

    return result.recordset[0] ?? null;
  }

  async createPassage(input: {
    title: string;
    content: string;
    level: string;
    partType: string;
    createdBy: number | null;
  }): Promise<number> {
    const request = await this.createRequest();
    this.bindInput(request, "title", sql.NVarChar(200), input.title);
    this.bindInput(request, "content", sql.NVarChar(sql.MAX), input.content);
    this.bindInput(request, "level", sql.NVarChar(50), input.level);
    this.bindInput(request, "partType", sql.NVarChar(50), input.partType);
    this.bindInput(request, "createdBy", sql.Int, input.createdBy);

    const result = await request.query<{ id: number }>(`
      INSERT INTO dbo.exercises (
        title,
        content,
        questions_json,
        correct_answers_json,
        level,
        type,
        category,
        estimated_minutes,
        source_type,
        created_by,
        description,
        is_active,
        created_at,
        updated_at
      )
      OUTPUT INSERTED.id
      VALUES (
        @title,
        @content,
        N'[]',
        N'[]',
        @level,
        @partType,
        N'General',
        CASE WHEN @partType = N'Part 6' THEN 20 ELSE 30 END,
        N'manual',
        @createdBy,
        N'',
        0,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
      )
    `);

    return result.recordset[0]?.id ?? 0;
  }

  async setQuestions(exerciseId: number, questions: ReadingQuestionInput[]): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "exerciseId", sql.Int, exerciseId);

    const normalized = questions.map((q, index) => ({
      questionText: q.questionText,
      options: [q.optionA, q.optionB, q.optionC, q.optionD],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation ?? "",
      orderNumber: index + 1,
    }));

    this.bindInput(request, "questionsJson", sql.NVarChar(sql.MAX), JSON.stringify(normalized));
    this.bindInput(
      request,
      "correctAnswersJson",
      sql.NVarChar(sql.MAX),
      JSON.stringify(normalized.map((q) => q.correctAnswer)),
    );

    const result = await request.query(`
      UPDATE dbo.exercises
      SET questions_json = @questionsJson,
          correct_answers_json = @correctAnswersJson,
          is_active = 1,
          updated_at = SYSUTCDATETIME()
      WHERE id = @exerciseId
    `);

    return (result.rowsAffected[0] ?? 0) > 0;
  }

  async updateExercise(
    id: number,
    input: { title: string; content: string; level: string; type: string; description?: string },
  ): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "id", sql.Int, id);
    this.bindInput(request, "title", sql.NVarChar(200), input.title);
    this.bindInput(request, "content", sql.NVarChar(sql.MAX), input.content);
    this.bindInput(request, "level", sql.NVarChar(50), input.level);
    this.bindInput(request, "type", sql.NVarChar(50), input.type);
    this.bindInput(request, "description", sql.NVarChar(500), input.description ?? "");

    const result = await request.query(`
      UPDATE dbo.exercises
      SET title = @title,
          content = @content,
          level = @level,
          type = @type,
          description = @description,
          updated_at = SYSUTCDATETIME()
      WHERE id = @id
    `);

    return (result.rowsAffected[0] ?? 0) > 0;
  }

  async remove(id: number): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "id", sql.Int, id);
    const result = await request.query(`DELETE FROM dbo.exercises WHERE id = @id`);
    return (result.rowsAffected[0] ?? 0) > 0;
  }

  async userExists(userId: number): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);
    const result = await request.query<{ count: number }>(`
      SELECT COUNT(1) AS count
      FROM dbo.users
      WHERE id = @userId
    `);
    return (result.recordset[0]?.count ?? 0) > 0;
  }

  async addCompletion(input: {
    userId: number;
    exerciseId: number;
    score: number;
    totalQuestions: number;
    completedAt: Date;
  }): Promise<number> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, input.userId);
    this.bindInput(request, "exerciseId", sql.Int, input.exerciseId);
    this.bindInput(request, "score", sql.Decimal(5, 2), input.score);
    this.bindInput(request, "totalQuestions", sql.Int, input.totalQuestions);
    this.bindInput(request, "completedAt", sql.DateTime2(3), input.completedAt);

    const attemptResult = await request.query<{ nextAttempt: number }>(`
      SELECT ISNULL(MAX(attempts), 0) + 1 AS nextAttempt
      FROM dbo.exercise_completions
      WHERE user_id = @userId
        AND exercise_id = @exerciseId
    `);

    const nextAttempt = attemptResult.recordset[0]?.nextAttempt ?? 1;
    this.bindInput(request, "attempts", sql.Int, nextAttempt);

    const result = await request.query<{ id: number }>(`
      INSERT INTO dbo.exercise_completions (
        user_id,
        exercise_id,
        user_answers_json,
        score,
        total_questions,
        started_at,
        completed_at,
        is_completed,
        time_spent_minutes,
        attempts,
        created_at
      )
      OUTPUT INSERTED.id
      VALUES (
        @userId,
        @exerciseId,
        N'[]',
        @score,
        @totalQuestions,
        DATEADD(MINUTE, -1, @completedAt),
        @completedAt,
        1,
        1,
        @attempts,
        SYSUTCDATETIME()
      )
    `);

    return result.recordset[0]?.id ?? 0;
  }
}
