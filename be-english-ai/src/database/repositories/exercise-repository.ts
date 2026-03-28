import sql from "mssql";
import { BaseRepository } from "./base-repository";

export type ExerciseSaveInput = {
  title: string;
  content: string | null;
  questionsJson: string;
  correctAnswersJson: string;
  level: string;
  type: string;
  category: string;
  estimatedMinutes: number;
  timeLimit: number;
  description: string | null;
  sourceType: string;
  createdBy: number;
};

export class ExerciseRepository extends BaseRepository {
  async save(input: ExerciseSaveInput): Promise<number> {
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
    this.bindInput(request, "sourceType", sql.NVarChar(100), input.sourceType);
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
        source_type,
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
        @sourceType,
        @createdBy,
        1,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
      )
    `);

    return result.recordset[0]?.id ?? 0;
  }
}

export const exerciseRepository = new ExerciseRepository();
