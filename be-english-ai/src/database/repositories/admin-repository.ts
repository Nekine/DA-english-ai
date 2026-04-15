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

export interface AdminContentSummaryRow {
  totalExercises: number;
  totalTests: number;
  exercisesCreatedToday: number;
  exercisesCreatedWeek: number;
  exercisesCreatedMonth: number;
  testsCreatedToday: number;
  testsCreatedWeek: number;
  testsCreatedMonth: number;
}

export interface AdminExerciseListRow {
  ExerciseId: number;
  Title: string;
  ExerciseType: string;
  PartType: string;
  Level: string;
  Status: string;
  CreatorUsername: string;
  CreatedAt: Date;
  QuestionCount: number;
  AttemptCount: number;
}

export interface AdminTestListRow {
  TestId: number;
  Title: string;
  ExamType: string;
  TotalParts: number;
  TotalQuestions: number;
  DurationMinutes: number;
  Status: string;
  CreatorUsername: string;
  CreatedAt: Date;
  AttemptCount: number;
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
          (SELECT COUNT(1) FROM dbo.TaiKhoan) AS totalUsers,
          (
            SELECT COUNT(1)
            FROM dbo.BaiTapAI bt
            WHERE bt.TrangThaiBaiTap <> N'archived'
          ) AS totalExercises,
          (
            SELECT COUNT(1)
            FROM dbo.BaiTapAI bt
            CROSS APPLY OPENJSON(bt.NoiDungJson, '$.questions')
            WHERE bt.TrangThaiBaiTap <> N'archived'
          ) AS totalQuestions,
          (
            SELECT COUNT(1)
            FROM dbo.BaiLamDeThiAI bl
            WHERE bl.TrangThaiBaiLam IN (N'submitted', N'graded')
          ) + (
            SELECT COUNT(1)
            FROM dbo.BaiLamBaiTapAI bl
            WHERE bl.TrangThaiBaiLam IN (N'submitted', N'graded')
          ) AS totalSubmissions,
          (
            SELECT COUNT(DISTINCT u.NguoiDungId)
            FROM (
              SELECT bl.NguoiDungId
              FROM dbo.BaiLamBaiTapAI bl
              WHERE bl.TrangThaiBaiLam IN (N'submitted', N'graded')
                AND CAST(bl.NgayTao AS DATE) = CAST(SYSDATETIME() AS DATE)

              UNION

              SELECT bl.NguoiDungId
              FROM dbo.BaiLamDeThiAI bl
              WHERE bl.TrangThaiBaiLam IN (N'submitted', N'graded')
                AND CAST(bl.NgayTao AS DATE) = CAST(SYSDATETIME() AS DATE)
            ) u
          ) AS activeUsersToday,
          (
            SELECT COUNT(DISTINCT u.NguoiDungId)
            FROM (
              SELECT bl.NguoiDungId
              FROM dbo.BaiLamBaiTapAI bl
              WHERE bl.TrangThaiBaiLam IN (N'submitted', N'graded')
                AND bl.NgayTao >= DATEADD(DAY, -6, CAST(SYSDATETIME() AS DATE))

              UNION

              SELECT bl.NguoiDungId
              FROM dbo.BaiLamDeThiAI bl
              WHERE bl.TrangThaiBaiLam IN (N'submitted', N'graded')
                AND bl.NgayTao >= DATEADD(DAY, -6, CAST(SYSDATETIME() AS DATE))
            ) u
          ) AS activeUsersThisWeek,
          (
            SELECT COUNT(1)
            FROM dbo.BaiTapAI bt
            WHERE bt.NgayTao >= DATEADD(DAY, -6, CAST(SYSDATETIME() AS DATE))
              AND bt.TrangThaiBaiTap <> N'archived'
          ) AS exercisesCreatedThisWeek,
          (
            SELECT COUNT(1)
            FROM dbo.BaiTapAI bt
            WHERE bt.TrangThaiBaiTap <> N'archived'
              AND LOWER(ISNULL(JSON_VALUE(bt.NoiDungJson, '$.sourceType'), N'')) = N'ai'
          ) AS aiGeneratedExercises,
          (
            SELECT ISNULL(AVG(CAST(sc.score AS FLOAT)), 0)
            FROM (
              SELECT bl.DiemSo AS score
              FROM dbo.BaiLamBaiTapAI bl
              WHERE bl.TrangThaiBaiLam IN (N'submitted', N'graded')
                AND bl.DiemSo IS NOT NULL

              UNION ALL

              SELECT bl.DiemSo AS score
              FROM dbo.BaiLamDeThiAI bl
              WHERE bl.TrangThaiBaiLam IN (N'submitted', N'graded')
                AND bl.DiemSo IS NOT NULL
            ) sc
          ) AS averageScore,
          (
            SELECT ISNULL(AVG(CAST(d.durationMinutes AS FLOAT)), 0)
            FROM (
              SELECT bl.ThoiGianLamPhut AS durationMinutes
              FROM dbo.BaiLamBaiTapAI bl
              WHERE bl.TrangThaiBaiLam IN (N'submitted', N'graded')
                AND bl.ThoiGianLamPhut IS NOT NULL

              UNION ALL

              SELECT bl.ThoiGianLamPhut AS durationMinutes
              FROM dbo.BaiLamDeThiAI bl
              WHERE bl.TrangThaiBaiLam IN (N'submitted', N'graded')
                AND bl.ThoiGianLamPhut IS NOT NULL
            ) d
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
          x.NguoiDungId,
          COUNT(1) AS totalExercises,
          ISNULL(AVG(CAST(x.DiemSo AS FLOAT)), 0) AS averageScore,
          ISNULL(SUM(CASE
            WHEN x.NgayTao >= DATEADD(DAY, -6, CAST(SYSDATETIME() AS DATE))
              THEN CAST(x.DiemSo AS INT)
            ELSE 0
          END), 0) AS weeklyXP,
          MAX(x.NgayTao) AS lastActivity
        FROM (
          SELECT
            bl.NguoiDungId,
            bl.DiemSo,
            bl.NgayTao
          FROM dbo.BaiLamBaiTapAI bl
          WHERE bl.TrangThaiBaiLam IN (N'submitted', N'graded')
            AND bl.DiemSo IS NOT NULL

          UNION ALL

          SELECT
            bl.NguoiDungId,
            bl.DiemSo,
            bl.NgayTao
          FROM dbo.BaiLamDeThiAI bl
          WHERE bl.TrangThaiBaiLam IN (N'submitted', N'graded')
            AND bl.DiemSo IS NOT NULL
        ) x
        GROUP BY x.NguoiDungId
      )
      SELECT TOP (10)
        CAST(tk.TaiKhoanId AS NVARCHAR(20)) AS UserId,
        tk.TenDangNhap AS Username,
        ISNULL(nd.HoVaTen, N'') AS FullName,
        ISNULL(tk.Email, N'') AS Email,
        ISNULL(a.totalExercises, 0) AS TotalExercises,
        ISNULL(a.averageScore, 0) AS AverageScore,
        ISNULL(td.TongXP, 0) AS TotalXP,
        ISNULL(a.weeklyXP, 0) AS WeeklyXP,
        a.lastActivity AS LastActivity,
        CASE WHEN tk.TrangThaiTaiKhoan = N'active' THEN N'Active' ELSE N'Inactive' END AS Status
      FROM dbo.TaiKhoan tk
      INNER JOIN dbo.NguoiDung nd ON nd.TaiKhoanId = tk.TaiKhoanId
      LEFT JOIN dbo.TienDoHocTap td ON td.NguoiDungId = nd.NguoiDungId
      LEFT JOIN completion_agg a ON a.NguoiDungId = nd.NguoiDungId
      WHERE tk.TrangThaiTaiKhoan = N'active' OR tk.TrangThaiTaiKhoan IS NULL
      ORDER BY ISNULL(td.TongXP, 0) DESC, ISNULL(a.totalExercises, 0) DESC
    `);

    return result.recordset;
  }

  async getExerciseById(exerciseId: number): Promise<ExerciseRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "exerciseId", sql.Int, exerciseId);

    const result = await request.query<ExerciseRow>(`
      SELECT TOP (1)
        bt.BaiTapAIId AS ExerciseId,
        COALESCE(JSON_VALUE(bt.NoiDungJson, '$.title'), bt.ChuDeBaiTap, CONCAT(N'Exercise #', CAST(bt.BaiTapAIId AS NVARCHAR(20)))) AS ExerciseName
      FROM dbo.BaiTapAI bt
      WHERE bt.BaiTapAIId = @exerciseId
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
        bl.NguoiDungId AS UserId,
        CAST(ISNULL(bl.DiemSo, 0) AS FLOAT) AS Score,
        bl.ThoiGianBatDau AS StartedAt,
        COALESCE(bl.ThoiGianHoanThanh, bl.NgayTao) AS CompletedAt
      FROM dbo.BaiLamBaiTapAI bl
      WHERE bl.BaiTapAIId = @exerciseId
        AND bl.TrangThaiBaiLam IN (N'submitted', N'graded')
    `);

    return result.recordset;
  }

  async countExercisesByIds(exerciseIds: number[]): Promise<number> {
    const request = await this.createRequest();
    this.bindInput(request, "exerciseIdsJson", sql.NVarChar(sql.MAX), this.buildIdsJson(exerciseIds));

    const result = await request.query<{ totalCount: number }>(`
      SELECT COUNT(1) AS totalCount
      FROM dbo.BaiTapAI bt
      WHERE bt.BaiTapAIId IN (
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
      UPDATE dbo.BaiTapAI
      SET TrangThaiBaiTap = N'archived',
          NgayCapNhat = SYSDATETIME()
      WHERE BaiTapAIId IN (
        SELECT TRY_CAST([value] AS INT)
        FROM OPENJSON(@exerciseIdsJson)
      )
    `);

    return result.rowsAffected[0] ?? 0;
  }

  async setExercisesActiveByIds(exerciseIds: number[], isActive: boolean): Promise<number> {
    const request = await this.createRequest();
    this.bindInput(request, "exerciseIdsJson", sql.NVarChar(sql.MAX), this.buildIdsJson(exerciseIds));
    this.bindInput(request, "status", sql.NVarChar(20), isActive ? "active" : "archived");

    const result = await request.query(`
      UPDATE dbo.BaiTapAI
      SET TrangThaiBaiTap = @status,
          NgayCapNhat = SYSDATETIME()
      WHERE BaiTapAIId IN (
        SELECT TRY_CAST([value] AS INT)
        FROM OPENJSON(@exerciseIdsJson)
      )
    `);

    return result.rowsAffected[0] ?? 0;
  }

  async getContentSummary(): Promise<AdminContentSummaryRow> {
    const request = await this.createRequest();

    const result = await request.query<AdminContentSummaryRow>(`
      SELECT TOP (1)
        (
          SELECT COUNT(1)
          FROM dbo.BaiTapAI bt
          WHERE bt.TrangThaiBaiTap <> N'archived'
        ) AS totalExercises,
        (
          SELECT COUNT(1)
          FROM dbo.DeThiAI dt
          WHERE dt.TrangThaiDeThi <> N'archived'
        ) AS totalTests,
        (
          SELECT COUNT(1)
          FROM dbo.BaiTapAI bt
          WHERE bt.TrangThaiBaiTap <> N'archived'
            AND CAST(bt.NgayTao AS DATE) = CAST(SYSDATETIME() AS DATE)
        ) AS exercisesCreatedToday,
        (
          SELECT COUNT(1)
          FROM dbo.BaiTapAI bt
          WHERE bt.TrangThaiBaiTap <> N'archived'
            AND bt.NgayTao >= DATEADD(DAY, -6, CAST(SYSDATETIME() AS DATE))
        ) AS exercisesCreatedWeek,
        (
          SELECT COUNT(1)
          FROM dbo.BaiTapAI bt
          WHERE bt.TrangThaiBaiTap <> N'archived'
            AND bt.NgayTao >= DATEADD(DAY, -29, CAST(SYSDATETIME() AS DATE))
        ) AS exercisesCreatedMonth,
        (
          SELECT COUNT(1)
          FROM dbo.DeThiAI dt
          WHERE dt.TrangThaiDeThi <> N'archived'
            AND CAST(dt.NgayTao AS DATE) = CAST(SYSDATETIME() AS DATE)
        ) AS testsCreatedToday,
        (
          SELECT COUNT(1)
          FROM dbo.DeThiAI dt
          WHERE dt.TrangThaiDeThi <> N'archived'
            AND dt.NgayTao >= DATEADD(DAY, -6, CAST(SYSDATETIME() AS DATE))
        ) AS testsCreatedWeek,
        (
          SELECT COUNT(1)
          FROM dbo.DeThiAI dt
          WHERE dt.TrangThaiDeThi <> N'archived'
            AND dt.NgayTao >= DATEADD(DAY, -29, CAST(SYSDATETIME() AS DATE))
        ) AS testsCreatedMonth
    `);

    return result.recordset[0] ?? {
      totalExercises: 0,
      totalTests: 0,
      exercisesCreatedToday: 0,
      exercisesCreatedWeek: 0,
      exercisesCreatedMonth: 0,
      testsCreatedToday: 0,
      testsCreatedWeek: 0,
      testsCreatedMonth: 0,
    };
  }

  async listExercisesForAdmin(): Promise<AdminExerciseListRow[]> {
    const request = await this.createRequest();

    const result = await request.query<AdminExerciseListRow>(`
      SELECT
        bt.BaiTapAIId AS ExerciseId,
        COALESCE(JSON_VALUE(bt.NoiDungJson, '$.title'), bt.ChuDeBaiTap, CONCAT(N'Exercise #', CAST(bt.BaiTapAIId AS NVARCHAR(20)))) AS Title,
        bt.KieuBaiTap AS ExerciseType,
        COALESCE(JSON_VALUE(bt.NoiDungJson, '$.type'), bt.KieuBaiTap, N'unknown') AS PartType,
        bt.TrinhDo AS Level,
        bt.TrangThaiBaiTap AS Status,
        ISNULL(tk.TenDangNhap, N'unknown') AS CreatorUsername,
        bt.NgayTao AS CreatedAt,
        ISNULL(q.QuestionCount, 0) AS QuestionCount,
        ISNULL(a.AttemptCount, 0) AS AttemptCount
      FROM dbo.BaiTapAI bt
      LEFT JOIN dbo.NguoiDung nd ON nd.NguoiDungId = bt.NguoiDungId
      LEFT JOIN dbo.TaiKhoan tk ON tk.TaiKhoanId = nd.TaiKhoanId
      OUTER APPLY (
        SELECT COUNT(1) AS QuestionCount
        FROM OPENJSON(bt.NoiDungJson, '$.questions')
      ) q
      OUTER APPLY (
        SELECT COUNT(1) AS AttemptCount
        FROM dbo.BaiLamBaiTapAI bl
        WHERE bl.BaiTapAIId = bt.BaiTapAIId
          AND bl.TrangThaiBaiLam IN (N'submitted', N'graded')
      ) a
      WHERE bt.TrangThaiBaiTap <> N'archived'
      ORDER BY bt.NgayTao DESC
    `);

    return result.recordset;
  }

  async listTestsForAdmin(): Promise<AdminTestListRow[]> {
    const request = await this.createRequest();

    const result = await request.query<AdminTestListRow>(`
      SELECT
        dt.DeThiAIId AS TestId,
        dt.TenDeThi AS Title,
        dt.KieuDeThi AS ExamType,
        dt.TongSoPhan AS TotalParts,
        dt.TongSoBaiTap AS TotalQuestions,
        dt.ThoiGianLamDe AS DurationMinutes,
        dt.TrangThaiDeThi AS Status,
        ISNULL(tk.TenDangNhap, N'unknown') AS CreatorUsername,
        dt.NgayTao AS CreatedAt,
        ISNULL(a.AttemptCount, 0) AS AttemptCount
      FROM dbo.DeThiAI dt
      LEFT JOIN dbo.NguoiDung nd ON nd.NguoiDungId = dt.NguoiDungId
      LEFT JOIN dbo.TaiKhoan tk ON tk.TaiKhoanId = nd.TaiKhoanId
      OUTER APPLY (
        SELECT COUNT(1) AS AttemptCount
        FROM dbo.BaiLamDeThiAI bl
        WHERE bl.DeThiAIId = dt.DeThiAIId
          AND bl.TrangThaiBaiLam IN (N'submitted', N'graded')
      ) a
      WHERE dt.TrangThaiDeThi <> N'archived'
      ORDER BY dt.NgayTao DESC
    `);

    return result.recordset;
  }

  async archiveExerciseById(exerciseId: number): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "exerciseId", sql.Int, exerciseId);

    const result = await request.query(`
      UPDATE dbo.BaiTapAI
      SET TrangThaiBaiTap = N'archived',
          NgayCapNhat = SYSDATETIME()
      WHERE BaiTapAIId = @exerciseId
        AND TrangThaiBaiTap <> N'archived'
    `);

    return (result.rowsAffected[0] ?? 0) > 0;
  }

  async archiveTestById(testId: number): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "testId", sql.Int, testId);

    const result = await request.query(`
      UPDATE dbo.DeThiAI
      SET TrangThaiDeThi = N'archived'
      WHERE DeThiAIId = @testId
        AND TrangThaiDeThi <> N'archived'
    `);

    return (result.rowsAffected[0] ?? 0) > 0;
  }
}
