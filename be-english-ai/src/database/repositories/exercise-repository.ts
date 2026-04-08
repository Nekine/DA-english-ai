import sql from "mssql";
import { BaseRepository } from "./base-repository";
import { getDbPool } from "../sqlserver/client";

export type ExerciseSaveInput = {
  requestedByTaiKhoanId: number;
  title: string;
  topic: string;
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
};

export type SentenceWritingSaveInput = {
  requestedByTaiKhoanId: number;
  title: string;
  topic: string;
  content: string | null;
  sentencesJson: string;
  level: string;
  category: string;
  estimatedMinutes: number;
  timeLimit: number;
  description: string | null;
};

export type ListeningSaveInput = {
  requestedByTaiKhoanId: number;
  title: string;
  topic: string;
  transcript: string;
  questionsJson: string;
  englishLevel: number;
  cefrLevel: string;
  genre: string;
  totalQuestions: number;
  audioContent: string | null;
  audioSegments: string[];
  audioFilePath: string | null;
  createdAt: Date;
  expiresAt?: Date;
};

export type ExerciseCoreRow = {
  exerciseId: number;
  nguoiDungId: number;
  kieuBaiTap: string;
  noiDungJson: string;
};

export type ExerciseCompletionDetailInput = {
  questionOrder: number;
  questionType: string;
  userAnswer: string | null;
  correctAnswer: string | null;
  isCorrect: boolean;
  scorePerQuestion: number;
  note?: string;
};

export type ListeningRecentExerciseRow = {
  exerciseId: number;
  noiDungJson: string;
  createdAt: Date;
};

export type CreatedExerciseRow = {
  exerciseId: number;
  kieuBaiTap: string;
  chuDeBaiTap: string | null;
  trinhDo: string | null;
  noiDungJson: string;
  createdAt: Date;
  updatedAt: Date;
};

export class ExerciseRepository extends BaseRepository {
  async resolveNguoiDungIdByTaiKhoanId(taiKhoanId: number): Promise<number | null> {
    if (!Number.isInteger(taiKhoanId) || taiKhoanId <= 0) {
      return null;
    }

    const findRequest = await this.createRequest();
    this.bindInput(findRequest, "taiKhoanId", sql.Int, taiKhoanId);
    const existing = await findRequest.query<{ NguoiDungId: number }>(`
      SELECT TOP 1 nd.NguoiDungId
      FROM dbo.NguoiDung nd
      WHERE nd.TaiKhoanId = @taiKhoanId
    `);

    const existingRow = existing.recordset[0];
    if (existingRow) {
      return Number(existingRow.NguoiDungId);
    }

    const accountRequest = await this.createRequest();
    this.bindInput(accountRequest, "taiKhoanId", sql.Int, taiKhoanId);
    const account = await accountRequest.query<{
      TaiKhoanId: number;
      Email: string | null;
      HoTen: string | null;
      TrinhDoMucTieu: string | null;
    }>(`
      SELECT TOP 1 tk.TaiKhoanId, tk.Email, tk.HoTen, tk.TrinhDoMucTieu
      FROM dbo.TaiKhoan tk
      WHERE tk.TaiKhoanId = @taiKhoanId
    `);

    if (account.recordset.length === 0) {
      return null;
    }

    const accountRow = account.recordset[0];
    if (!accountRow) {
      return null;
    }

    const emailRaw = String(accountRow.Email ?? `user${taiKhoanId}@local.dev`).trim().toLowerCase();
    const username = emailRaw.includes("@")
      ? (emailRaw.split("@")[0] ?? `user${taiKhoanId}`)
      : `user${taiKhoanId}`;
    const fullName = String(accountRow.HoTen ?? "User").trim();
    const level = String(accountRow.TrinhDoMucTieu ?? "A1").trim().toUpperCase();

    const createRequest = await this.createRequest();
    this.bindInput(createRequest, "taiKhoanId", sql.Int, taiKhoanId);
    this.bindInput(createRequest, "tenDangNhap", sql.NVarChar(100), username.slice(0, 100));
    this.bindInput(createRequest, "email", sql.NVarChar(255), emailRaw.slice(0, 255));
    this.bindInput(createRequest, "hoTen", sql.NVarChar(255), fullName.slice(0, 255));
    this.bindInput(createRequest, "trinhDo", sql.NVarChar(10), level.slice(0, 10));

    const created = await createRequest.query<{ NguoiDungId: number }>(`
      INSERT INTO dbo.NguoiDung (
        TaiKhoanId,
        TenDangNhap,
        Email,
        HoTen,
        TrinhDoHienTai,
        TrinhDoMucTieu,
        VaiTro,
        TrangThai,
        NgayTao,
        NgayCapNhat
      )
      OUTPUT INSERTED.NguoiDungId
      VALUES (
        @taiKhoanId,
        @tenDangNhap,
        @email,
        @hoTen,
        @trinhDo,
        @trinhDo,
        N'user',
        N'active',
        SYSDATETIME(),
        SYSDATETIME()
      )
    `);

    return created.recordset[0]?.NguoiDungId ?? null;
  }

  async save(input: ExerciseSaveInput): Promise<number> {
    const nguoiDungId = await this.resolveNguoiDungIdByTaiKhoanId(input.requestedByTaiKhoanId);
    if (!nguoiDungId) {
      return 0;
    }

    const noiDung = {
      title: input.title,
      topic: input.topic,
      content: input.content,
      questions: JSON.parse(input.questionsJson) as unknown,
      correctAnswers: JSON.parse(input.correctAnswersJson) as unknown,
      level: input.level,
      type: input.type,
      category: input.category,
      estimatedMinutes: input.estimatedMinutes,
      timeLimit: input.timeLimit,
      description: input.description,
      sourceType: input.sourceType,
    };

    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);
    this.bindInput(request, "level", sql.NVarChar(50), input.level);
    this.bindInput(request, "type", sql.NVarChar(50), input.type);
    this.bindInput(request, "title", sql.NVarChar(255), input.title);
    this.bindInput(request, "topic", sql.NVarChar(255), input.topic);
    this.bindInput(request, "noiDungJson", sql.NVarChar(sql.MAX), JSON.stringify(noiDung));
    this.bindInput(request, "description", sql.NVarChar(500), input.description);
    this.bindInput(request, "sourceType", sql.NVarChar(100), input.sourceType);

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
        N'grammar',
        @topic,
        @level,
        @noiDungJson,
        N'active',
        SYSDATETIME()
      )
    `);

    return result.recordset[0]?.id ?? 0;
  }

  async saveSentenceWriting(input: SentenceWritingSaveInput): Promise<number> {
    const nguoiDungId = await this.resolveNguoiDungIdByTaiKhoanId(input.requestedByTaiKhoanId);
    if (!nguoiDungId) {
      return 0;
    }

    const noiDung = {
      title: input.title,
      topic: input.topic,
      content: input.content,
      sentences: JSON.parse(input.sentencesJson) as unknown,
      level: input.level,
      category: input.category,
      estimatedMinutes: input.estimatedMinutes,
      timeLimit: input.timeLimit,
      description: input.description,
      sourceType: "ai_generated_writing",
    };

    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);
    this.bindInput(request, "level", sql.NVarChar(50), input.level);
    this.bindInput(request, "title", sql.NVarChar(255), input.title);
    this.bindInput(request, "topic", sql.NVarChar(255), input.topic);
    this.bindInput(request, "noiDungJson", sql.NVarChar(sql.MAX), JSON.stringify(noiDung));
    this.bindInput(request, "description", sql.NVarChar(500), input.description);

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
        N'writing',
        @topic,
        @level,
        @noiDungJson,
        N'active',
        SYSDATETIME()
      )
    `);

    return result.recordset[0]?.id ?? 0;
  }

  async saveListening(input: ListeningSaveInput): Promise<number> {
    const nguoiDungId = await this.resolveNguoiDungIdByTaiKhoanId(input.requestedByTaiKhoanId);
    if (!nguoiDungId) {
      return 0;
    }

    const noiDung = {
      title: input.title,
      topic: input.topic,
      transcript: input.transcript,
      questions: JSON.parse(input.questionsJson) as unknown,
      englishLevel: input.englishLevel,
      cefrLevel: input.cefrLevel,
      genre: input.genre,
      totalQuestions: input.totalQuestions,
      audioContent: input.audioContent,
      audioSegments: input.audioSegments,
      audioFilePath: input.audioFilePath,
      createdAt: input.createdAt.toISOString(),
      ...(input.expiresAt ? { expiresAt: input.expiresAt.toISOString() } : {}),
      sourceType: "ai_generated_listening",
    };

    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);
    this.bindInput(request, "topic", sql.NVarChar(255), input.topic);
    this.bindInput(request, "level", sql.NVarChar(20), input.cefrLevel);
    this.bindInput(request, "noiDungJson", sql.NVarChar(sql.MAX), JSON.stringify(noiDung));

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
        N'listening',
        @topic,
        @level,
        @noiDungJson,
        N'active',
        SYSDATETIME()
      )
    `);

    return result.recordset[0]?.id ?? 0;
  }

  async listRecentListeningExercises(nguoiDungId: number, take: number): Promise<ListeningRecentExerciseRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);
    this.bindInput(request, "take", sql.Int, take);

    const result = await request.query<ListeningRecentExerciseRow>(`
      SELECT TOP (@take)
        bt.BaiTapAIId AS exerciseId,
        bt.NoiDungJson AS noiDungJson,
        bt.NgayTao AS createdAt
      FROM dbo.BaiTapAI bt
      WHERE bt.NguoiDungId = @nguoiDungId
        AND bt.KieuBaiTap = N'listening'
        AND bt.TrangThaiBaiTap = N'active'
      ORDER BY bt.NgayTao DESC
    `);

    return result.recordset;
  }

  async getExerciseById(exerciseId: number, nguoiDungId: number): Promise<ExerciseCoreRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "exerciseId", sql.Int, exerciseId);
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);

    const result = await request.query<ExerciseCoreRow>(`
      SELECT TOP (1)
        bt.BaiTapAIId AS exerciseId,
        bt.NguoiDungId AS nguoiDungId,
        bt.KieuBaiTap AS kieuBaiTap,
        bt.NoiDungJson AS noiDungJson
      FROM dbo.BaiTapAI bt
      WHERE bt.BaiTapAIId = @exerciseId
        AND bt.NguoiDungId = @nguoiDungId
        AND bt.TrangThaiBaiTap = N'active'
    `);

    return result.recordset[0] ?? null;
  }

  async listCreatedExercises(input: {
    nguoiDungId: number;
    kind: "grammar" | "writing" | "listening" | "reading";
    take: number;
  }): Promise<CreatedExerciseRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, input.nguoiDungId);
    this.bindInput(request, "kind", sql.NVarChar(50), input.kind);
    this.bindInput(request, "take", sql.Int, input.take);

    const result = await request.query<CreatedExerciseRow>(`
      SELECT TOP (@take)
        bt.BaiTapAIId AS exerciseId,
        bt.KieuBaiTap AS kieuBaiTap,
        bt.ChuDeBaiTap AS chuDeBaiTap,
        bt.TrinhDo AS trinhDo,
        bt.NoiDungJson AS noiDungJson,
        bt.NgayTao AS createdAt,
        bt.NgayCapNhat AS updatedAt
      FROM dbo.BaiTapAI bt
      WHERE bt.NguoiDungId = @nguoiDungId
        AND bt.KieuBaiTap = @kind
        AND bt.TrangThaiBaiTap = N'active'
      ORDER BY bt.NgayTao DESC
    `);

    return result.recordset;
  }

  async addCompletion(input: {
    nguoiDungId: number;
    exerciseId: number;
    answersJson: unknown;
    resultJson: unknown;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    completedAt: Date;
    details: ExerciseCompletionDetailInput[];
  }): Promise<number> {
    const pool = await getDbPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const attemptRequest = new sql.Request(transaction);
      this.bindInput(attemptRequest, "nguoiDungId", sql.Int, input.nguoiDungId);
      this.bindInput(attemptRequest, "exerciseId", sql.Int, input.exerciseId);

      const attemptResult = await attemptRequest.query<{ nextAttempt: number }>(`
        SELECT ISNULL(MAX(LanThu), 0) + 1 AS nextAttempt
        FROM dbo.BaiLamBaiTapAI
        WHERE NguoiDungId = @nguoiDungId
          AND BaiTapAIId = @exerciseId
      `);

      const nextAttempt = attemptResult.recordset[0]?.nextAttempt ?? 1;
      const incorrectAnswers = Math.max(0, input.totalQuestions - input.correctAnswers);

      const headerRequest = new sql.Request(transaction);
      this.bindInput(headerRequest, "exerciseId", sql.Int, input.exerciseId);
      this.bindInput(headerRequest, "nguoiDungId", sql.Int, input.nguoiDungId);
      this.bindInput(headerRequest, "lanThu", sql.Int, nextAttempt);
      this.bindInput(headerRequest, "cauTraLoiJson", sql.NVarChar(sql.MAX), JSON.stringify(input.answersJson));
      this.bindInput(headerRequest, "ketQuaChamJson", sql.NVarChar(sql.MAX), JSON.stringify(input.resultJson));
      this.bindInput(headerRequest, "diemSo", sql.Decimal(5, 2), input.score);
      this.bindInput(headerRequest, "tongSoCau", sql.Int, input.totalQuestions);
      this.bindInput(headerRequest, "soCauDung", sql.Int, input.correctAnswers);
      this.bindInput(headerRequest, "soCauSai", sql.Int, incorrectAnswers);
      this.bindInput(
        headerRequest,
        "thoiGianBatDau",
        sql.DateTime2(0),
        new Date(input.completedAt.getTime() - 60 * 1000),
      );
      this.bindInput(headerRequest, "thoiGianHoanThanh", sql.DateTime2(0), input.completedAt);

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
          1,
          N'graded',
          N'Auto graded'
        )
      `);

      const baiLamId = headerResult.recordset[0]?.id ?? 0;

      for (const detail of input.details) {
        const detailRequest = new sql.Request(transaction);
        this.bindInput(detailRequest, "baiLamId", sql.Int, baiLamId);
        this.bindInput(detailRequest, "questionOrder", sql.Int, detail.questionOrder);
        this.bindInput(detailRequest, "questionType", sql.NVarChar(50), detail.questionType);
        this.bindInput(detailRequest, "userAnswer", sql.NVarChar(sql.MAX), detail.userAnswer);
        this.bindInput(detailRequest, "correctAnswer", sql.NVarChar(sql.MAX), detail.correctAnswer);
        this.bindInput(detailRequest, "isCorrect", sql.Bit, detail.isCorrect);
        this.bindInput(detailRequest, "score", sql.Decimal(5, 2), detail.scorePerQuestion);
        this.bindInput(detailRequest, "ghiChuAI", sql.NVarChar(sql.MAX), detail.note ?? "");

        await detailRequest.query(`
          INSERT INTO dbo.ChiTietChamBaiBaiTapAI (
            BaiLamBaiTapAIId,
            SoThuTuCauHoi,
            KieuCauHoi,
            CauTraLoiNguoiDung,
            DapAnDung,
            DungSai,
            Diem,
            GhiChuAI
          )
          VALUES (
            @baiLamId,
            @questionOrder,
            @questionType,
            @userAnswer,
            @correctAnswer,
            @isCorrect,
            @score,
            @ghiChuAI
          )
        `);
      }

      await transaction.commit();
      return baiLamId;
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {
        // Ignore rollback errors when transaction is already finalized.
      }
      throw error;
    }
  }
}

export const exerciseRepository = new ExerciseRepository();
