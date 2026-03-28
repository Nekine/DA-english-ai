import sql from "mssql";
import { BaseRepository } from "./base-repository";

export interface WritingExerciseRow {
  id: number;
  title: string;
  content: string | null;
  questionsJson: string;
  correctAnswersJson: string;
  level: string | null;
  type: "writing_essay" | "writing_sentence";
  category: string | null;
  estimatedMinutes: number | null;
  timeLimit: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface WritingExerciseCreateInput {
  title: string;
  content: string | null;
  questionsJson: string;
  correctAnswersJson: string;
  level: string | null;
  type: "writing_essay" | "writing_sentence";
  category: string | null;
  estimatedMinutes: number | null;
  timeLimit: number | null;
  description: string | null;
  createdBy: number | null;
}

export class WritingExerciseRepository extends BaseRepository {
  async getAll(type?: "writing_essay" | "writing_sentence"): Promise<WritingExerciseRow[]> {
    const request = await this.createRequest();
    let whereClause = "WHERE e.type IN (N'writing_essay', N'writing_sentence')";

    if (type) {
      whereClause += " AND e.type = @type";
      this.bindInput(request, "type", sql.NVarChar(50), type);
    }

    const result = await request.query<WritingExerciseRow>(`
      SELECT
        e.id,
        e.title,
        e.content,
        e.questions_json AS questionsJson,
        e.correct_answers_json AS correctAnswersJson,
        e.level,
        e.type,
        e.category,
        e.estimated_minutes AS estimatedMinutes,
        e.time_limit AS timeLimit,
        e.description,
        e.is_active AS isActive,
        e.created_at AS createdAt
      FROM dbo.exercises e
      ${whereClause}
      ORDER BY e.created_at DESC
    `);

    return result.recordset;
  }

  async getById(id: number): Promise<WritingExerciseRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "id", sql.Int, id);

    const result = await request.query<WritingExerciseRow>(`
      SELECT TOP (1)
        e.id,
        e.title,
        e.content,
        e.questions_json AS questionsJson,
        e.correct_answers_json AS correctAnswersJson,
        e.level,
        e.type,
        e.category,
        e.estimated_minutes AS estimatedMinutes,
        e.time_limit AS timeLimit,
        e.description,
        e.is_active AS isActive,
        e.created_at AS createdAt
      FROM dbo.exercises e
      WHERE e.id = @id
        AND e.type IN (N'writing_essay', N'writing_sentence')
    `);

    return result.recordset[0] ?? null;
  }

  async create(input: WritingExerciseCreateInput): Promise<number> {
    const request = await this.createRequest();
    this.bindInput(request, "title", sql.NVarChar(200), input.title);
    this.bindInput(request, "content", sql.NVarChar(sql.MAX), input.content);
    this.bindInput(request, "questionsJson", sql.NVarChar(sql.MAX), input.questionsJson);
    this.bindInput(request, "correctAnswersJson", sql.NVarChar(sql.MAX), input.correctAnswersJson);
    this.bindInput(request, "level", sql.NVarChar(50), input.level);
    this.bindInput(request, "type", sql.NVarChar(50), input.type);
    this.bindInput(request, "category", sql.NVarChar(100), input.category);
    this.bindInput(request, "estimatedMinutes", sql.Int, input.estimatedMinutes);
    this.bindInput(request, "timeLimit", sql.Int, input.timeLimit);
    this.bindInput(request, "description", sql.NVarChar(500), input.description);
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
        time_limit,
        description,
        created_by,
        is_active,
        created_at,
        updated_at
      )
      OUTPUT INSERTED.id
      VALUES (
        @title,
        @content,
        @questionsJson,
        @correctAnswersJson,
        @level,
        @type,
        @category,
        @estimatedMinutes,
        @timeLimit,
        @description,
        @createdBy,
        1,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
      )
    `);

    return result.recordset[0]?.id ?? 0;
  }

  async update(id: number, input: WritingExerciseCreateInput): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "id", sql.Int, id);
    this.bindInput(request, "title", sql.NVarChar(200), input.title);
    this.bindInput(request, "content", sql.NVarChar(sql.MAX), input.content);
    this.bindInput(request, "questionsJson", sql.NVarChar(sql.MAX), input.questionsJson);
    this.bindInput(request, "correctAnswersJson", sql.NVarChar(sql.MAX), input.correctAnswersJson);
    this.bindInput(request, "level", sql.NVarChar(50), input.level);
    this.bindInput(request, "type", sql.NVarChar(50), input.type);
    this.bindInput(request, "category", sql.NVarChar(100), input.category);
    this.bindInput(request, "estimatedMinutes", sql.Int, input.estimatedMinutes);
    this.bindInput(request, "timeLimit", sql.Int, input.timeLimit);
    this.bindInput(request, "description", sql.NVarChar(500), input.description);

    const result = await request.query(`
      UPDATE dbo.exercises
      SET title = @title,
          content = @content,
          questions_json = @questionsJson,
          correct_answers_json = @correctAnswersJson,
          level = @level,
          type = @type,
          category = @category,
          estimated_minutes = @estimatedMinutes,
          time_limit = @timeLimit,
          description = @description,
          updated_at = SYSUTCDATETIME()
      WHERE id = @id
        AND type IN (N'writing_essay', N'writing_sentence')
    `);

    return (result.rowsAffected[0] ?? 0) > 0;
  }

  async remove(id: number): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "id", sql.Int, id);

    const result = await request.query(`
      DELETE FROM dbo.exercises
      WHERE id = @id
        AND type IN (N'writing_essay', N'writing_sentence')
    `);

    return (result.rowsAffected[0] ?? 0) > 0;
  }
}
