import sql from "mssql";
import { BaseRepository } from "./base-repository";
import { getDbPool } from "../sqlserver/client";
import { exerciseRepository } from "./exercise-repository";

export interface ReadingExerciseRow {
  id: number;
  nguoiDungId: number;
  topic: string | null;
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

function resolveCompletionTiming(input: {
  completedAt: Date;
  startedAt?: Date;
  timeSpentMinutes?: number;
}): { startedAt: Date; timeSpentMinutes: number } {
  const completedAtMs = input.completedAt.getTime();

  const providedMinutes = Number.isFinite(input.timeSpentMinutes)
    ? Math.max(1, Math.round(Number(input.timeSpentMinutes)))
    : null;

  const startedAtValid =
    input.startedAt instanceof Date
    && !Number.isNaN(input.startedAt.getTime())
    && input.startedAt.getTime() <= completedAtMs;

  const startedAtMs = startedAtValid ? input.startedAt!.getTime() : null;
  const minutesFromStartedAt = startedAtMs !== null
    ? Math.max(1, Math.round((completedAtMs - startedAtMs) / 60000))
    : null;

  const effectiveMinutes = providedMinutes ?? minutesFromStartedAt ?? 1;
  const effectiveStartedAt = startedAtMs !== null
    ? new Date(startedAtMs)
    : new Date(completedAtMs - effectiveMinutes * 60 * 1000);

  return {
    startedAt: effectiveStartedAt,
    timeSpentMinutes: effectiveMinutes,
  };
}

export class ReadingExerciseRepository extends BaseRepository {
  async resolveNguoiDungIdByTaiKhoanId(taiKhoanId: number): Promise<number | null> {
    return exerciseRepository.resolveNguoiDungIdByTaiKhoanId(taiKhoanId);
  }

  async getAll(filters: {
    nguoiDungId: number;
    level?: string;
    type?: string;
    sourceType?: string;
  }): Promise<ReadingExerciseRow[]> {
    const request = await this.createRequest();
    const whereParts: string[] = [
      "bt.NguoiDungId = @nguoiDungId",
      "bt.KieuBaiTap = N'reading'",
      "bt.TrangThaiBaiTap = N'active'",
    ];
    this.bindInput(request, "nguoiDungId", sql.Int, filters.nguoiDungId);

    if (filters.level) {
      whereParts.push("(bt.TrinhDo = @level OR JSON_VALUE(bt.NoiDungJson, '$.level') = @level)");
      this.bindInput(request, "level", sql.NVarChar(50), filters.level);
    }
    if (filters.type) {
      whereParts.push("JSON_VALUE(bt.NoiDungJson, '$.type') = @type");
      this.bindInput(request, "type", sql.NVarChar(50), filters.type);
    }
    if (filters.sourceType) {
      whereParts.push("JSON_VALUE(bt.NoiDungJson, '$.sourceType') = @sourceType");
      this.bindInput(request, "sourceType", sql.NVarChar(100), filters.sourceType);
    }

    const result = await request.query<ReadingExerciseRow>(`
      SELECT
        bt.BaiTapAIId AS id,
        bt.NguoiDungId AS nguoiDungId,
        bt.ChuDeBaiTap AS topic,
        JSON_VALUE(bt.NoiDungJson, '$.title') AS title,
        JSON_VALUE(bt.NoiDungJson, '$.content') AS content,
        COALESCE(bt.TrinhDo, JSON_VALUE(bt.NoiDungJson, '$.level')) AS level,
        JSON_VALUE(bt.NoiDungJson, '$.type') AS type,
        JSON_VALUE(bt.NoiDungJson, '$.sourceType') AS sourceType,
        JSON_VALUE(bt.NoiDungJson, '$.category') AS category,
        TRY_CONVERT(INT, JSON_VALUE(bt.NoiDungJson, '$.estimatedMinutes')) AS estimatedMinutes,
        bt.NguoiDungId AS createdBy,
        JSON_VALUE(bt.NoiDungJson, '$.description') AS description,
        COALESCE(JSON_QUERY(bt.NoiDungJson, '$.questions'), N'[]') AS questionsJson,
        COALESCE(JSON_QUERY(bt.NoiDungJson, '$.correctAnswers'), N'[]') AS correctAnswersJson,
        CAST(CASE WHEN bt.TrangThaiBaiTap = N'active' THEN 1 ELSE 0 END AS BIT) AS isActive,
        bt.NgayTao AS createdAt,
        bt.NgayCapNhat AS updatedAt
      FROM dbo.BaiTapAI bt
      WHERE ${whereParts.join(" AND ")}
      ORDER BY bt.NgayTao DESC
    `);

    return result.recordset;
  }

  async getById(id: number, nguoiDungId: number): Promise<ReadingExerciseRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "id", sql.Int, id);
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);

    const result = await request.query<ReadingExerciseRow>(`
      SELECT TOP (1)
        bt.BaiTapAIId AS id,
        bt.NguoiDungId AS nguoiDungId,
        bt.ChuDeBaiTap AS topic,
        JSON_VALUE(bt.NoiDungJson, '$.title') AS title,
        JSON_VALUE(bt.NoiDungJson, '$.content') AS content,
        COALESCE(bt.TrinhDo, JSON_VALUE(bt.NoiDungJson, '$.level')) AS level,
        JSON_VALUE(bt.NoiDungJson, '$.type') AS type,
        JSON_VALUE(bt.NoiDungJson, '$.sourceType') AS sourceType,
        JSON_VALUE(bt.NoiDungJson, '$.category') AS category,
        TRY_CONVERT(INT, JSON_VALUE(bt.NoiDungJson, '$.estimatedMinutes')) AS estimatedMinutes,
        bt.NguoiDungId AS createdBy,
        JSON_VALUE(bt.NoiDungJson, '$.description') AS description,
        COALESCE(JSON_QUERY(bt.NoiDungJson, '$.questions'), N'[]') AS questionsJson,
        COALESCE(JSON_QUERY(bt.NoiDungJson, '$.correctAnswers'), N'[]') AS correctAnswersJson,
        CAST(CASE WHEN bt.TrangThaiBaiTap = N'active' THEN 1 ELSE 0 END AS BIT) AS isActive,
        bt.NgayTao AS createdAt,
        bt.NgayCapNhat AS updatedAt
      FROM dbo.BaiTapAI bt
      WHERE bt.BaiTapAIId = @id
        AND bt.NguoiDungId = @nguoiDungId
        AND bt.KieuBaiTap = N'reading'
        AND bt.TrangThaiBaiTap = N'active'
    `);

    return result.recordset[0] ?? null;
  }

  async getByIdAnyUser(id: number): Promise<ReadingExerciseRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "id", sql.Int, id);

    const result = await request.query<ReadingExerciseRow>(`
      SELECT TOP (1)
        bt.BaiTapAIId AS id,
        bt.NguoiDungId AS nguoiDungId,
        bt.ChuDeBaiTap AS topic,
        JSON_VALUE(bt.NoiDungJson, '$.title') AS title,
        JSON_VALUE(bt.NoiDungJson, '$.content') AS content,
        COALESCE(bt.TrinhDo, JSON_VALUE(bt.NoiDungJson, '$.level')) AS level,
        JSON_VALUE(bt.NoiDungJson, '$.type') AS type,
        JSON_VALUE(bt.NoiDungJson, '$.sourceType') AS sourceType,
        JSON_VALUE(bt.NoiDungJson, '$.category') AS category,
        TRY_CONVERT(INT, JSON_VALUE(bt.NoiDungJson, '$.estimatedMinutes')) AS estimatedMinutes,
        bt.NguoiDungId AS createdBy,
        JSON_VALUE(bt.NoiDungJson, '$.description') AS description,
        COALESCE(JSON_QUERY(bt.NoiDungJson, '$.questions'), N'[]') AS questionsJson,
        COALESCE(JSON_QUERY(bt.NoiDungJson, '$.correctAnswers'), N'[]') AS correctAnswersJson,
        CAST(CASE WHEN bt.TrangThaiBaiTap = N'active' THEN 1 ELSE 0 END AS BIT) AS isActive,
        bt.NgayTao AS createdAt,
        bt.NgayCapNhat AS updatedAt
      FROM dbo.BaiTapAI bt
      WHERE bt.BaiTapAIId = @id
        AND bt.KieuBaiTap = N'reading'
        AND bt.TrangThaiBaiTap = N'active'
    `);

    return result.recordset[0] ?? null;
  }

  async createPassage(input: {
    title: string;
    content: string;
    level: string;
    partType: string;
    nguoiDungId: number;
    sourceType?: string;
    description?: string;
    topic?: string;
    rawAiPayload?: unknown;
  }): Promise<number> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, input.nguoiDungId);
    this.bindInput(request, "topic", sql.NVarChar(200), input.topic ?? input.title);
    this.bindInput(request, "level", sql.NVarChar(20), input.level);

    const payload = {
      title: input.title,
      content: input.content,
      level: input.level,
      type: input.partType,
      sourceType: input.sourceType ?? "manual",
      category: input.topic ?? "General",
      estimatedMinutes: input.partType === "Part 6" ? 20 : 30,
      description: input.description ?? "",
      questions: [] as Array<unknown>,
      correctAnswers: [] as Array<unknown>,
      ...(input.rawAiPayload !== undefined ? { rawAiPayload: input.rawAiPayload } : {}),
    };
    this.bindInput(request, "noiDungJson", sql.NVarChar(sql.MAX), JSON.stringify(payload));

    const result = await request.query<{ id: number }>(`
      INSERT INTO dbo.BaiTapAI (
        NguoiDungId,
        KieuBaiTap,
        ChuDeBaiTap,
        TrinhDo,
        NoiDungJson,
        TrangThaiBaiTap,
        NgayCapNhat
      )
      OUTPUT INSERTED.BaiTapAIId AS id
      VALUES (
        @nguoiDungId,
        N'reading',
        @topic,
        @level,
        @noiDungJson,
        N'active',
        SYSDATETIME()
      )
    `);

    return result.recordset[0]?.id ?? 0;
  }

  async setQuestions(
    exerciseId: number,
    nguoiDungId: number,
    questions: ReadingQuestionInput[],
  ): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "exerciseId", sql.Int, exerciseId);
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);

    const currentResult = await request.query<{ noiDungJson: string }>(`
      SELECT TOP (1) bt.NoiDungJson AS noiDungJson
      FROM dbo.BaiTapAI bt
      WHERE bt.BaiTapAIId = @exerciseId
        AND bt.NguoiDungId = @nguoiDungId
        AND bt.KieuBaiTap = N'reading'
        AND bt.TrangThaiBaiTap = N'active'
    `);

    const currentJson = currentResult.recordset[0]?.noiDungJson;
    if (!currentJson) {
      return false;
    }

    const payload = JSON.parse(currentJson) as Record<string, unknown>;

    const normalized = questions.map((q, index) => ({
      questionText: q.questionText,
      options: [q.optionA, q.optionB, q.optionC, q.optionD],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation ?? "",
      orderNumber: index + 1,
    }));

    payload.questions = normalized;
    payload.correctAnswers = normalized.map((q) => q.correctAnswer);
    this.bindInput(request, "noiDungJson", sql.NVarChar(sql.MAX), JSON.stringify(payload));

    const result = await request.query(`
      UPDATE dbo.BaiTapAI
      SET NoiDungJson = @noiDungJson,
          NgayCapNhat = SYSDATETIME()
      WHERE BaiTapAIId = @exerciseId
        AND NguoiDungId = @nguoiDungId
        AND KieuBaiTap = N'reading'
        AND TrangThaiBaiTap = N'active'
    `);

    return (result.rowsAffected[0] ?? 0) > 0;
  }

  async updateExercise(
    id: number,
    nguoiDungId: number,
    input: { title: string; content: string; level: string; type: string; description?: string },
  ): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "id", sql.Int, id);
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);

    const currentResult = await request.query<{ noiDungJson: string }>(`
      SELECT TOP (1) bt.NoiDungJson AS noiDungJson
      FROM dbo.BaiTapAI bt
      WHERE bt.BaiTapAIId = @id
        AND bt.NguoiDungId = @nguoiDungId
        AND bt.KieuBaiTap = N'reading'
        AND bt.TrangThaiBaiTap = N'active'
    `);

    const currentJson = currentResult.recordset[0]?.noiDungJson;
    if (!currentJson) {
      return false;
    }

    const payload = JSON.parse(currentJson) as Record<string, unknown>;
    payload.title = input.title;
    payload.content = input.content;
    payload.level = input.level;
    payload.type = input.type;
    payload.description = input.description ?? "";

    this.bindInput(request, "level", sql.NVarChar(20), input.level);
    this.bindInput(request, "topic", sql.NVarChar(200), input.title);
    this.bindInput(request, "noiDungJson", sql.NVarChar(sql.MAX), JSON.stringify(payload));

    const result = await request.query(`
      UPDATE dbo.BaiTapAI
      SET ChuDeBaiTap = @topic,
          TrinhDo = @level,
          NoiDungJson = @noiDungJson,
          NgayCapNhat = SYSDATETIME()
      WHERE BaiTapAIId = @id
        AND NguoiDungId = @nguoiDungId
        AND KieuBaiTap = N'reading'
        AND TrangThaiBaiTap = N'active'
    `);

    return (result.rowsAffected[0] ?? 0) > 0;
  }

  async remove(id: number, nguoiDungId: number): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "id", sql.Int, id);
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);
    const result = await request.query(`
      UPDATE dbo.BaiTapAI
      SET TrangThaiBaiTap = N'archived',
          NgayCapNhat = SYSDATETIME()
      WHERE BaiTapAIId = @id
        AND NguoiDungId = @nguoiDungId
        AND KieuBaiTap = N'reading'
        AND TrangThaiBaiTap = N'active'
    `);
    return (result.rowsAffected[0] ?? 0) > 0;
  }

  async addCompletion(input: {
    nguoiDungId: number;
    exerciseId: number;
    answers: number[];
    questionDetails: Array<{
      questionText: string;
      options: string[];
      correctAnswerIndex: number;
      explanation?: string;
    }>;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    startedAt?: Date;
    completedAt: Date;
    timeSpentMinutes?: number;
  }): Promise<{ completionId: number; attemptNumber: number }> {
    const pool = await getDbPool();
    const transaction = pool.transaction();
    let transactionStarted = false;

    try {
      await transaction.begin();
      transactionStarted = true;

      const attemptRequest = transaction.request();
      this.bindInput(attemptRequest, "nguoiDungId", sql.Int, input.nguoiDungId);
      this.bindInput(attemptRequest, "exerciseId", sql.Int, input.exerciseId);

      const attemptResult = await attemptRequest.query<{ nextAttempt: number }>(`
        SELECT ISNULL(MAX(LanThu), 0) + 1 AS nextAttempt
        FROM dbo.BaiLamBaiTapAI
        WHERE NguoiDungId = @nguoiDungId
          AND BaiTapAIId = @exerciseId
      `);

      const nextAttempt = attemptResult.recordset[0]?.nextAttempt ?? 1;
      const timing = resolveCompletionTiming({
        completedAt: input.completedAt,
        ...(input.startedAt ? { startedAt: input.startedAt } : {}),
        ...(typeof input.timeSpentMinutes === "number" ? { timeSpentMinutes: input.timeSpentMinutes } : {}),
      });

      const answeredDetails = input.questionDetails.map((question, index) => {
        const selectedIndex = input.answers?.[index] ?? -1;
        const selectedText = selectedIndex >= 0 ? question.options[selectedIndex] ?? null : null;
        const correctText = question.options[question.correctAnswerIndex] ?? null;
        const isCorrect = selectedIndex === question.correctAnswerIndex;
        const scorePerQuestion =
          input.totalQuestions > 0 && isCorrect
            ? Math.round((10000 / input.totalQuestions)) / 100
            : 0;

        return {
          questionOrder: index + 1,
          selectedText,
          correctText,
          isCorrect,
          scorePerQuestion,
          note: question.explanation ?? "",
          questionType: "reading",
        };
      });

      const summaryJson = {
        totalQuestions: input.totalQuestions,
        correctAnswers: input.correctAnswers,
        incorrectAnswers: Math.max(0, input.totalQuestions - input.correctAnswers),
        score: input.score,
        submittedAt: input.completedAt.toISOString(),
      };

      const answerJson = {
        answers: input.answers,
      };

      const headerRequest = transaction.request();
      this.bindInput(headerRequest, "exerciseId", sql.Int, input.exerciseId);
      this.bindInput(headerRequest, "nguoiDungId", sql.Int, input.nguoiDungId);
      this.bindInput(headerRequest, "lanThu", sql.Int, nextAttempt);
      this.bindInput(headerRequest, "cauTraLoiJson", sql.NVarChar(sql.MAX), JSON.stringify(answerJson));
      this.bindInput(headerRequest, "ketQuaChamJson", sql.NVarChar(sql.MAX), JSON.stringify(summaryJson));
      this.bindInput(headerRequest, "diemSo", sql.Decimal(5, 2), input.score);
      this.bindInput(headerRequest, "tongSoCau", sql.Int, input.totalQuestions);
      this.bindInput(headerRequest, "soCauDung", sql.Int, input.correctAnswers);
      this.bindInput(headerRequest, "soCauSai", sql.Int, Math.max(0, input.totalQuestions - input.correctAnswers));
      this.bindInput(headerRequest, "thoiGianBatDau", sql.DateTime2(0), timing.startedAt);
      this.bindInput(headerRequest, "thoiGianHoanThanh", sql.DateTime2(0), input.completedAt);
      this.bindInput(headerRequest, "thoiGianLamPhut", sql.Int, timing.timeSpentMinutes);

      const headerResult = await headerRequest.query<{ id: number }>(`
        INSERT INTO dbo.BaiLamBaiTapAI (
          BaiTapAIId,
          NguoiDungId,
          LanThu,
          CauTraLoiJson,
          KetQuaChamJson,
          DiemSo,
          TongSoCau,
          SoCauDung,
          SoCauSai,
          ThoiGianBatDau,
          ThoiGianHoanThanh,
          ThoiGianLamPhut,
          TrangThaiBaiLam,
          NhanXetAI
        )
        OUTPUT INSERTED.BaiLamBaiTapAIId AS id
        VALUES (
          @exerciseId,
          @nguoiDungId,
          @lanThu,
          @cauTraLoiJson,
          @ketQuaChamJson,
          @diemSo,
          @tongSoCau,
          @soCauDung,
          @soCauSai,
          @thoiGianBatDau,
          @thoiGianHoanThanh,
          @thoiGianLamPhut,
          N'graded',
          N'Auto graded'
        )
      `);

      const baiLamId = headerResult.recordset[0]?.id ?? 0;

      // v4 schema has no per-question detail table, so persistence is stored in BaiLamBaiTapAI JSON columns.

      await transaction.commit();
      transactionStarted = false;
      return {
        completionId: baiLamId,
        attemptNumber: nextAttempt,
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await transaction.rollback();
        } catch {
          // Ignore rollback errors when transaction is already finalized.
        }
      }
      throw error;
    }
  }
}
