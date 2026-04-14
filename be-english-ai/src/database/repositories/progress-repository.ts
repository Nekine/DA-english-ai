import sql from "mssql";
import { BaseRepository } from "./base-repository";

export interface ProgressSeedRow {
  nguoiDungId: number;
  taiKhoanId: number;
  hoVaTen: string | null;
  tenDangNhap: string;
  trinhDoHienTai: string | null;
  tongXP: number | null;
  tongPhutHoc: number | null;
  tongBaiDaLam: number | null;
  tongBaiHoanThanh: number | null;
  tongBaiDat: number | null;
  tongBaiKhongDat: number | null;
  tongDeThiDaLam: number | null;
  diemTrungBinhDeThi: number | null;
  soNgayDiemDanhLienTiep: number | null;
  ngayDiemDanhGanNhat: Date | null;
  mucTieuHangNgayPhut: number | null;
  capDoHienTai: string | null;
}

export interface ExerciseTypeAggregateRow {
  exerciseType: string;
  completedCount: number;
  averageScore: number;
  totalMinutes: number;
  lastCompletedAt: Date | null;
}

export interface ExerciseCompletionSummaryRow {
  totalExercises: number;
  passedExercises: number;
  totalMinutes: number;
  averageScore: number;
}

export interface ExamCompletionSummaryRow {
  totalExams: number;
  passedExams: number;
  totalMinutes: number;
  averageScore: number;
}

export interface ExerciseXpSummaryRow {
  totalExercises: number;
  passedExercises: number;
  totalMinutes: number;
}

export interface ExamXpSummaryRow {
  totalExams: number;
  passedExams: number;
  totalMinutes: number;
}

export interface ExamPartAggregateRow {
  partNumber: number;
  attemptCount: number;
  averageScore: number;
}

export interface RecentActivityRow {
  id: number;
  sourceType: "exercise" | "exam";
  exerciseType: string | null;
  topic: string | null;
  completedAt: Date;
  score: number;
  timeSpentMinutes: number;
}

export interface DailyProgressAggregateRow {
  dateKey: Date;
  exercisesCompleted: number;
  timeSpentMinutes: number;
}

export interface AttendanceCheckInRow {
  created: boolean | number;
  checkInDate: Date;
  xpAwarded?: number;
}

export interface AttendanceDayRow {
  dateKey: Date;
  soPhutHoc: number;
  xpThuong: number;
  coHoanThanhMucTieu: boolean | number;
}

export class ProgressRepository extends BaseRepository {
  async getSeedByNguoiDungId(nguoiDungId: number): Promise<ProgressSeedRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);

    const result = await request.query<ProgressSeedRow>(`
      SELECT TOP (1)
        nd.NguoiDungId AS nguoiDungId,
        nd.TaiKhoanId AS taiKhoanId,
        nd.HoVaTen AS hoVaTen,
        tk.TenDangNhap AS tenDangNhap,
        nd.TrinhDoHienTai AS trinhDoHienTai,
        td.TongXP AS tongXP,
        td.TongPhutHoc AS tongPhutHoc,
        td.TongBaiDaLam AS tongBaiDaLam,
        td.TongBaiHoanThanh AS tongBaiHoanThanh,
        td.TongBaiDat AS tongBaiDat,
        td.TongBaiKhongDat AS tongBaiKhongDat,
        td.TongDeThiDaLam AS tongDeThiDaLam,
        td.DiemTrungBinhDeThi AS diemTrungBinhDeThi,
        td.SoNgayDiemDanhLienTiep AS soNgayDiemDanhLienTiep,
        td.NgayDiemDanhGanNhat AS ngayDiemDanhGanNhat,
        td.MucTieuHangNgayPhut AS mucTieuHangNgayPhut,
        td.CapDoHienTai AS capDoHienTai
      FROM dbo.NguoiDung nd
      INNER JOIN dbo.TaiKhoan tk ON tk.TaiKhoanId = nd.TaiKhoanId
      LEFT JOIN dbo.TienDoHocTap td ON td.NguoiDungId = nd.NguoiDungId
      WHERE nd.NguoiDungId = @nguoiDungId
    `);

    return result.recordset[0] ?? null;
  }

  async getSeedByTaiKhoanId(taiKhoanId: number): Promise<ProgressSeedRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "taiKhoanId", sql.Int, taiKhoanId);

    const result = await request.query<ProgressSeedRow>(`
      SELECT TOP (1)
        nd.NguoiDungId AS nguoiDungId,
        nd.TaiKhoanId AS taiKhoanId,
        nd.HoVaTen AS hoVaTen,
        tk.TenDangNhap AS tenDangNhap,
        nd.TrinhDoHienTai AS trinhDoHienTai,
        td.TongXP AS tongXP,
        td.TongPhutHoc AS tongPhutHoc,
        td.TongBaiDaLam AS tongBaiDaLam,
        td.TongBaiHoanThanh AS tongBaiHoanThanh,
        td.TongBaiDat AS tongBaiDat,
        td.TongBaiKhongDat AS tongBaiKhongDat,
        td.TongDeThiDaLam AS tongDeThiDaLam,
        td.DiemTrungBinhDeThi AS diemTrungBinhDeThi,
        td.SoNgayDiemDanhLienTiep AS soNgayDiemDanhLienTiep,
        td.NgayDiemDanhGanNhat AS ngayDiemDanhGanNhat,
        td.MucTieuHangNgayPhut AS mucTieuHangNgayPhut,
        td.CapDoHienTai AS capDoHienTai
      FROM dbo.NguoiDung nd
      INNER JOIN dbo.TaiKhoan tk ON tk.TaiKhoanId = nd.TaiKhoanId
      LEFT JOIN dbo.TienDoHocTap td ON td.NguoiDungId = nd.NguoiDungId
      WHERE nd.TaiKhoanId = @taiKhoanId
    `);

    return result.recordset[0] ?? null;
  }

  async getExerciseCompletionSummary(nguoiDungId: number): Promise<ExerciseCompletionSummaryRow> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);

    const result = await request.query<ExerciseCompletionSummaryRow>(`
      SELECT
        COUNT(1) AS totalExercises,
        SUM(CASE WHEN ISNULL(bl.DiemSo, 0) >= 70 THEN 1 ELSE 0 END) AS passedExercises,
        ISNULL(SUM(ISNULL(bl.ThoiGianLamPhut, 0)), 0) AS totalMinutes,
        ISNULL(AVG(CAST(ISNULL(bl.DiemSo, 0) AS FLOAT)), 0) AS averageScore
      FROM dbo.BaiLamBaiTapAI bl
      WHERE bl.NguoiDungId = @nguoiDungId
        AND bl.TrangThaiBaiLam IN (N'submitted', N'graded')
    `);

    return result.recordset[0] ?? {
      totalExercises: 0,
      passedExercises: 0,
      totalMinutes: 0,
      averageScore: 0,
    };
  }

  async getExamCompletionSummary(nguoiDungId: number): Promise<ExamCompletionSummaryRow> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);

    const result = await request.query<ExamCompletionSummaryRow>(`
      SELECT
        COUNT(1) AS totalExams,
        SUM(CASE WHEN ISNULL(bl.DiemSo, 0) >= 70 THEN 1 ELSE 0 END) AS passedExams,
        ISNULL(SUM(ISNULL(bl.ThoiGianLamPhut, 0)), 0) AS totalMinutes,
        ISNULL(AVG(CAST(ISNULL(bl.DiemSo, 0) AS FLOAT)), 0) AS averageScore
      FROM dbo.BaiLamDeThiAI bl
      WHERE bl.NguoiDungId = @nguoiDungId
        AND bl.TrangThaiBaiLam IN (N'submitted', N'graded')
    `);

    return result.recordset[0] ?? {
      totalExams: 0,
      passedExams: 0,
      totalMinutes: 0,
      averageScore: 0,
    };
  }

  async getExerciseXpSummary(nguoiDungId: number): Promise<ExerciseXpSummaryRow> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);

    const result = await request.query<ExerciseXpSummaryRow>(`
      SELECT
        COUNT(1) AS totalExercises,
        SUM(CASE WHEN ISNULL(bl.DiemSo, 0) >= 70 THEN 1 ELSE 0 END) AS passedExercises,
        ISNULL(SUM(ISNULL(bl.ThoiGianLamPhut, 0)), 0) AS totalMinutes
      FROM dbo.BaiLamBaiTapAI bl
      WHERE bl.NguoiDungId = @nguoiDungId
        AND bl.LanThu = 1
        AND bl.TrangThaiBaiLam IN (N'submitted', N'graded')
    `);

    return result.recordset[0] ?? {
      totalExercises: 0,
      passedExercises: 0,
      totalMinutes: 0,
    };
  }

  async getExamXpSummary(nguoiDungId: number): Promise<ExamXpSummaryRow> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);

    const result = await request.query<ExamXpSummaryRow>(`
      SELECT
        COUNT(1) AS totalExams,
        SUM(CASE WHEN ISNULL(bl.DiemSo, 0) >= 70 THEN 1 ELSE 0 END) AS passedExams,
        ISNULL(SUM(ISNULL(bl.ThoiGianLamPhut, 0)), 0) AS totalMinutes
      FROM dbo.BaiLamDeThiAI bl
      WHERE bl.NguoiDungId = @nguoiDungId
        AND bl.LanThu = 1
        AND bl.TrangThaiBaiLam IN (N'submitted', N'graded')
    `);

    return result.recordset[0] ?? {
      totalExams: 0,
      passedExams: 0,
      totalMinutes: 0,
    };
  }

  async getExerciseTypeAggregates(nguoiDungId: number): Promise<ExerciseTypeAggregateRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);

    const result = await request.query<ExerciseTypeAggregateRow>(`
      SELECT
        bt.KieuBaiTap AS exerciseType,
        COUNT(1) AS completedCount,
        ISNULL(AVG(CAST(ISNULL(bl.DiemSo, 0) AS FLOAT)), 0) AS averageScore,
        ISNULL(SUM(ISNULL(bl.ThoiGianLamPhut, 0)), 0) AS totalMinutes,
        MAX(bl.NgayTao) AS lastCompletedAt
      FROM dbo.BaiLamBaiTapAI bl
      INNER JOIN dbo.BaiTapAI bt ON bt.BaiTapAIId = bl.BaiTapAIId
      WHERE bl.NguoiDungId = @nguoiDungId
        AND bl.TrangThaiBaiLam IN (N'submitted', N'graded')
      GROUP BY bt.KieuBaiTap
      ORDER BY completedCount DESC
    `);

    return result.recordset;
  }

  async getExamPartAggregates(nguoiDungId: number): Promise<ExamPartAggregateRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);

    const result = await request.query<ExamPartAggregateRow>(`
      SELECT
        ps.partNumber AS partNumber,
        COUNT(1) AS attemptCount,
        ISNULL(AVG(CAST(ISNULL(ps.score, 0) AS FLOAT)), 0) AS averageScore
      FROM dbo.BaiLamDeThiAI bl
      CROSS APPLY OPENJSON(bl.KetQuaChamJson, '$.partSummaries')
        WITH (
          partNumber INT '$.partNumber',
          score FLOAT '$.score'
        ) ps
      WHERE bl.NguoiDungId = @nguoiDungId
        AND bl.TrangThaiBaiLam IN (N'submitted', N'graded')
      GROUP BY ps.partNumber
      ORDER BY ps.partNumber ASC
    `);

    return result.recordset;
  }

  async getRecentActivities(nguoiDungId: number, limit: number): Promise<RecentActivityRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);
    this.bindInput(request, "limit", sql.Int, Math.max(1, Math.min(100, limit)));

    const result = await request.query<RecentActivityRow>(`
      WITH merged AS (
        SELECT
          bl.BaiLamBaiTapAIId AS id,
          CAST(N'exercise' AS NVARCHAR(20)) AS sourceType,
          bt.KieuBaiTap AS exerciseType,
          bt.ChuDeBaiTap AS topic,
          bl.NgayTao AS completedAt,
          ISNULL(bl.DiemSo, 0) AS score,
          ISNULL(bl.ThoiGianLamPhut, 0) AS timeSpentMinutes
        FROM dbo.BaiLamBaiTapAI bl
        INNER JOIN dbo.BaiTapAI bt ON bt.BaiTapAIId = bl.BaiTapAIId
        WHERE bl.NguoiDungId = @nguoiDungId
          AND bl.TrangThaiBaiLam IN (N'submitted', N'graded')

        UNION ALL

        SELECT
          bl.BaiLamDeThiAIId AS id,
          CAST(N'exam' AS NVARCHAR(20)) AS sourceType,
          CAST(N'test_exam' AS NVARCHAR(50)) AS exerciseType,
          COALESCE(NULLIF(dt.TenDeThi, N''), CAST(N'TOEIC Test' AS NVARCHAR(200))) AS topic,
          bl.NgayTao AS completedAt,
          ISNULL(bl.DiemSo, 0) AS score,
          ISNULL(bl.ThoiGianLamPhut, 0) AS timeSpentMinutes
        FROM dbo.BaiLamDeThiAI bl
        LEFT JOIN dbo.DeThiAI dt ON dt.DeThiAIId = bl.DeThiAIId
        WHERE bl.NguoiDungId = @nguoiDungId
          AND bl.TrangThaiBaiLam IN (N'submitted', N'graded')
      )
      SELECT TOP (@limit)
        id,
        sourceType,
        exerciseType,
        topic,
        completedAt,
        score,
        timeSpentMinutes
      FROM merged
      ORDER BY completedAt DESC
    `);

    return result.recordset;
  }

  async getDailyProgressLastDays(nguoiDungId: number, days: number): Promise<DailyProgressAggregateRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);
    this.bindInput(request, "days", sql.Int, Math.max(1, Math.min(31, days)));

    const result = await request.query<DailyProgressAggregateRow>(`
      WITH day_range AS (
        SELECT TOP (@days)
          CAST(DATEADD(DAY, -ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) + 1, CAST(SYSDATETIME() AS DATE)) AS DATE) AS dateKey
        FROM sys.all_objects
      ),
      activity AS (
        SELECT
          CAST(bl.NgayTao AS DATE) AS dateKey,
          COUNT(1) AS exercisesCompleted,
          ISNULL(SUM(ISNULL(bl.ThoiGianLamPhut, 0)), 0) AS timeSpentMinutes
        FROM dbo.BaiLamBaiTapAI bl
        WHERE bl.NguoiDungId = @nguoiDungId
          AND bl.TrangThaiBaiLam IN (N'submitted', N'graded')
          AND bl.NgayTao >= DATEADD(DAY, -@days + 1, CAST(SYSDATETIME() AS DATE))
        GROUP BY CAST(bl.NgayTao AS DATE)

        UNION ALL

        SELECT
          CAST(bl.NgayTao AS DATE) AS dateKey,
          COUNT(1) AS exercisesCompleted,
          ISNULL(SUM(ISNULL(bl.ThoiGianLamPhut, 0)), 0) AS timeSpentMinutes
        FROM dbo.BaiLamDeThiAI bl
        WHERE bl.NguoiDungId = @nguoiDungId
          AND bl.TrangThaiBaiLam IN (N'submitted', N'graded')
          AND bl.NgayTao >= DATEADD(DAY, -@days + 1, CAST(SYSDATETIME() AS DATE))
        GROUP BY CAST(bl.NgayTao AS DATE)
      )
      SELECT
        d.dateKey AS dateKey,
        ISNULL(SUM(a.exercisesCompleted), 0) AS exercisesCompleted,
        ISNULL(SUM(a.timeSpentMinutes), 0) AS timeSpentMinutes
      FROM day_range d
      LEFT JOIN activity a ON a.dateKey = d.dateKey
      GROUP BY d.dateKey
      ORDER BY d.dateKey ASC
    `);

    return result.recordset;
  }

  async upsertTienDoHocTap(input: {
    nguoiDungId: number;
    tongPhutHoc: number;
    tongXP: number;
    tongBaiDaLam: number;
    tongBaiHoanThanh: number;
    tongBaiDat: number;
    tongBaiKhongDat: number;
    tongDeThiDaLam: number;
    diemTrungBinhDeThi: number;
    soNgayDiemDanhLienTiep: number;
    ngayDiemDanhGanNhat: Date | null;
    mucTieuHangNgayPhut: number;
    capDoHienTai: string | null;
  }): Promise<void> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, input.nguoiDungId);
    this.bindInput(request, "tongPhutHoc", sql.Int, Math.max(0, Math.trunc(input.tongPhutHoc)));
    this.bindInput(request, "tongXP", sql.Int, Math.max(0, Math.trunc(input.tongXP)));
    this.bindInput(request, "tongBaiDaLam", sql.Int, Math.max(0, Math.trunc(input.tongBaiDaLam)));
    this.bindInput(request, "tongBaiHoanThanh", sql.Int, Math.max(0, Math.trunc(input.tongBaiHoanThanh)));
    this.bindInput(request, "tongBaiDat", sql.Int, Math.max(0, Math.trunc(input.tongBaiDat)));
    this.bindInput(request, "tongBaiKhongDat", sql.Int, Math.max(0, Math.trunc(input.tongBaiKhongDat)));
    this.bindInput(request, "tongDeThiDaLam", sql.Int, Math.max(0, Math.trunc(input.tongDeThiDaLam)));
    this.bindInput(request, "diemTrungBinhDeThi", sql.Decimal(5, 2), input.diemTrungBinhDeThi);
    this.bindInput(request, "soNgayDiemDanhLienTiep", sql.Int, Math.max(0, Math.trunc(input.soNgayDiemDanhLienTiep)));
    this.bindInput(request, "ngayDiemDanhGanNhat", sql.Date, input.ngayDiemDanhGanNhat);
    this.bindInput(request, "mucTieuHangNgayPhut", sql.Int, Math.max(0, Math.trunc(input.mucTieuHangNgayPhut)));
    this.bindInput(request, "capDoHienTai", sql.NVarChar(20), input.capDoHienTai);

    await request.query(`
      MERGE dbo.TienDoHocTap AS target
      USING (SELECT @nguoiDungId AS NguoiDungId) AS src
      ON target.NguoiDungId = src.NguoiDungId
      WHEN MATCHED THEN
        UPDATE SET
          TongPhutHoc = @tongPhutHoc,
          TongXP = @tongXP,
          TongBaiDaLam = @tongBaiDaLam,
          TongBaiHoanThanh = @tongBaiHoanThanh,
          TongBaiDat = @tongBaiDat,
          TongBaiKhongDat = @tongBaiKhongDat,
          TongDeThiDaLam = @tongDeThiDaLam,
          DiemTrungBinhDeThi = @diemTrungBinhDeThi,
          SoNgayDiemDanhLienTiep = @soNgayDiemDanhLienTiep,
          NgayDiemDanhGanNhat = @ngayDiemDanhGanNhat,
          MucTieuHangNgayPhut = @mucTieuHangNgayPhut,
          CapDoHienTai = @capDoHienTai,
          CapNhatLuc = SYSDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (
          NguoiDungId,
          TongPhutHoc,
          TongXP,
          TongBaiDaLam,
          TongBaiHoanThanh,
          TongBaiDat,
          TongBaiKhongDat,
          TongDeThiDaLam,
          DiemTrungBinhDeThi,
          SoNgayDiemDanhLienTiep,
          NgayDiemDanhGanNhat,
          MucTieuHangNgayPhut,
          CapDoHienTai,
          CapNhatLuc
        )
        VALUES (
          @nguoiDungId,
          @tongPhutHoc,
          @tongXP,
          @tongBaiDaLam,
          @tongBaiHoanThanh,
          @tongBaiDat,
          @tongBaiKhongDat,
          @tongDeThiDaLam,
          @diemTrungBinhDeThi,
          @soNgayDiemDanhLienTiep,
          @ngayDiemDanhGanNhat,
          @mucTieuHangNgayPhut,
          @capDoHienTai,
          SYSDATETIME()
        );
    `);
  }

  async upsertDiemDanhNgay(input: {
    nguoiDungId: number;
    ngayDiemDanh: Date;
    soPhutHoc: number;
    xpThuong: number;
    coHoanThanhMucTieu: boolean;
  }): Promise<void> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, input.nguoiDungId);
    this.bindInput(request, "ngayDiemDanh", sql.Date, input.ngayDiemDanh);
    this.bindInput(request, "soPhutHoc", sql.Int, Math.max(0, Math.trunc(input.soPhutHoc)));
    this.bindInput(request, "xpThuong", sql.Int, Math.max(0, Math.trunc(input.xpThuong)));
    this.bindInput(request, "coHoanThanhMucTieu", sql.Bit, input.coHoanThanhMucTieu);

    await request.query(`
      MERGE dbo.DiemDanhNgay AS target
      USING (SELECT @nguoiDungId AS NguoiDungId, @ngayDiemDanh AS NgayDiemDanh) AS src
      ON target.NguoiDungId = src.NguoiDungId
      AND target.NgayDiemDanh = src.NgayDiemDanh
      WHEN MATCHED THEN
        UPDATE SET
          SoPhutHoc = @soPhutHoc,
          XPThuong = @xpThuong,
          CoHoanThanhMucTieu = @coHoanThanhMucTieu
      WHEN NOT MATCHED THEN
        INSERT (NguoiDungId, NgayDiemDanh, SoPhutHoc, XPThuong, CoHoanThanhMucTieu)
        VALUES (@nguoiDungId, @ngayDiemDanh, @soPhutHoc, @xpThuong, @coHoanThanhMucTieu);
    `);
  }

  async recordAttendanceFromCompletion(input: {
    nguoiDungId: number;
    completedAt: Date;
    minutesSpent: number;
    dailyGoalMinutes: number;
  }): Promise<{ created: boolean; checkInDate: Date }> {
    const request = await this.createRequest();
    const safeMinutes = Math.max(1, Math.trunc(input.minutesSpent));
    const safeGoal = Math.max(1, Math.trunc(input.dailyGoalMinutes));
    const xpBonus = Math.max(1, Math.round(safeMinutes / 5));

    this.bindInput(request, "nguoiDungId", sql.Int, input.nguoiDungId);
    this.bindInput(request, "completedAt", sql.DateTime2, input.completedAt);
    this.bindInput(request, "minutesSpent", sql.Int, safeMinutes);
    this.bindInput(request, "xpBonus", sql.Int, xpBonus);
    this.bindInput(request, "dailyGoalMinutes", sql.Int, safeGoal);

    const result = await request.query<AttendanceCheckInRow>(`
      DECLARE @checkInDate DATE = CAST(@completedAt AS DATE);

      IF EXISTS (
        SELECT 1
        FROM dbo.DiemDanhNgay WITH (UPDLOCK, HOLDLOCK)
        WHERE NguoiDungId = @nguoiDungId
          AND NgayDiemDanh = @checkInDate
      )
      BEGIN
        UPDATE dbo.DiemDanhNgay
        SET
          SoPhutHoc = ISNULL(SoPhutHoc, 0) + @minutesSpent,
          XPThuong = ISNULL(XPThuong, 0) + @xpBonus,
          CoHoanThanhMucTieu = CASE
            WHEN ISNULL(SoPhutHoc, 0) + @minutesSpent >= @dailyGoalMinutes THEN 1
            ELSE ISNULL(CoHoanThanhMucTieu, 0)
          END
        WHERE NguoiDungId = @nguoiDungId
          AND NgayDiemDanh = @checkInDate;

        SELECT
          CAST(0 AS BIT) AS created,
          @checkInDate AS checkInDate,
          CAST(0 AS INT) AS xpAwarded;
      END
      ELSE
      BEGIN
        INSERT INTO dbo.DiemDanhNgay (
          NguoiDungId,
          NgayDiemDanh,
          SoPhutHoc,
          XPThuong,
          CoHoanThanhMucTieu
        )
        VALUES (
          @nguoiDungId,
          @checkInDate,
          @minutesSpent,
          @xpBonus,
          CASE WHEN @minutesSpent >= @dailyGoalMinutes THEN 1 ELSE 0 END
        );

        UPDATE dbo.TienDoHocTap
        SET
          TongXP = ISNULL(TongXP, 0) + @xpBonus,
          CapNhatLuc = SYSDATETIME()
        WHERE NguoiDungId = @nguoiDungId;

        IF @@ROWCOUNT = 0
        BEGIN
          INSERT INTO dbo.TienDoHocTap (NguoiDungId, TongXP, CapNhatLuc)
          VALUES (@nguoiDungId, @xpBonus, SYSDATETIME());
        END

        SELECT
          CAST(1 AS BIT) AS created,
          @checkInDate AS checkInDate,
          @xpBonus AS xpAwarded;
      END
    `);

    const row = result.recordset[0];
    return {
      created: Boolean(row?.created),
      checkInDate: row?.checkInDate ?? new Date(input.completedAt),
    };
  }

  async getAttendanceDays(nguoiDungId: number, days: number): Promise<AttendanceDayRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);
    this.bindInput(request, "days", sql.Int, Math.max(1, Math.min(365, Math.trunc(days))));

    const result = await request.query<AttendanceDayRow>(`
      SELECT
        CAST(dd.NgayDiemDanh AS DATE) AS dateKey,
        ISNULL(dd.SoPhutHoc, 0) AS soPhutHoc,
        ISNULL(dd.XPThuong, 0) AS xpThuong,
        ISNULL(dd.CoHoanThanhMucTieu, 0) AS coHoanThanhMucTieu
      FROM dbo.DiemDanhNgay dd
      WHERE dd.NguoiDungId = @nguoiDungId
        AND dd.NgayDiemDanh >= DATEADD(DAY, -@days + 1, CAST(SYSDATETIME() AS DATE))
      ORDER BY dd.NgayDiemDanh ASC
    `);

    return result.recordset;
  }

  async getAllAttendanceDays(nguoiDungId: number): Promise<AttendanceDayRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);

    const result = await request.query<AttendanceDayRow>(`
      SELECT
        CAST(dd.NgayDiemDanh AS DATE) AS dateKey,
        ISNULL(dd.SoPhutHoc, 0) AS soPhutHoc,
        ISNULL(dd.XPThuong, 0) AS xpThuong,
        ISNULL(dd.CoHoanThanhMucTieu, 0) AS coHoanThanhMucTieu
      FROM dbo.DiemDanhNgay dd
      WHERE dd.NguoiDungId = @nguoiDungId
      ORDER BY dd.NgayDiemDanh ASC
    `);

    return result.recordset;
  }
}

export const progressRepository = new ProgressRepository();
