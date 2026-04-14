import sql from "mssql";
import { BaseRepository } from "./base-repository";
import { getDbPool } from "../sqlserver/client";

export type ExercisePerformanceAggregateRow = {
  kieuBaiTap: string;
  chuDeBaiTap: string | null;
  attemptCount: number;
  avgScore: number;
  weightedAvgScore: number;
  totalQuestions: number;
  totalWrong: number;
  latestAt: Date | null;
};

export type ExamCompletionSnapshotRow = {
  baiLamDeThiAIId: number;
  diemSo: number | null;
  tongSoCau: number | null;
  soCauDung: number | null;
  soCauSai: number | null;
  ketQuaChamJson: string | null;
  ngayTao: Date;
};

export type UserWeaknessInput = {
  kieuBaiTap: string;
  chuDeBaiTap?: string;
  khaNang: string;
  moTaDiemYeu: string;
  mucDoUuTien: number;
  soLanXuatHien: number;
  soLanSai: number;
  diemTrungBinh?: number;
};

export type UserWeaknessRow = {
  diemYeuNguoiDungId: number;
  nguoiDungId: number;
  kieuBaiTap: string;
  chuDeBaiTap: string | null;
  khaNang: string;
  moTaDiemYeu: string;
  mucDoUuTien: number;
  soLanXuatHien: number;
  soLanSai: number;
  diemTrungBinh: number | null;
  lanCapNhatCuoi: Date;
};

export type LearningRoadmapRow = {
  loTrinhHocTapAIId: number;
  nguoiDungId: number;
  tenLoTrinh: string;
  duLieuJson: string;
  trangThai: string;
  ngayTao: Date;
  ngayCapNhat: Date;
};

type RoadmapIdentityRow = {
  loTrinhHocTapAIId: number;
};

type UserLevelRow = {
  currentLevel: string | null;
};

export class LearningInsightsRepository extends BaseRepository {
  async getCurrentUserLevel(nguoiDungId: number): Promise<string | null> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);

    const result = await request.query<UserLevelRow>(`
      SELECT TOP (1)
        COALESCE(
          NULLIF(LTRIM(RTRIM(nd.TrinhDoHienTai)), N''),
          NULLIF(LTRIM(RTRIM(td.CapDoHienTai)), N'')
        ) AS currentLevel
      FROM dbo.NguoiDung nd
      LEFT JOIN dbo.TienDoHocTap td ON td.NguoiDungId = nd.NguoiDungId
      WHERE nd.NguoiDungId = @nguoiDungId
    `);

    return result.recordset[0]?.currentLevel ?? null;
  }

  async listExercisePerformanceAggregates(
    nguoiDungId: number,
    withinDays = 90,
  ): Promise<ExercisePerformanceAggregateRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);
    this.bindInput(request, "withinDays", sql.Int, Math.max(1, withinDays));

    const result = await request.query<ExercisePerformanceAggregateRow>(`
      SELECT
        bt.KieuBaiTap AS kieuBaiTap,
        bt.ChuDeBaiTap AS chuDeBaiTap,
        COUNT(1) AS attemptCount,
        ISNULL(AVG(CAST(ISNULL(bl.DiemSo, 0) AS FLOAT)), 0) AS avgScore,
        ISNULL(
          SUM(
            CAST(ISNULL(bl.DiemSo, 0) AS FLOAT)
            * CASE
                WHEN bl.NgayTao >= DATEADD(DAY, -7, SYSDATETIME()) THEN 1.8
                WHEN bl.NgayTao >= DATEADD(DAY, -21, SYSDATETIME()) THEN 1.4
                WHEN bl.NgayTao >= DATEADD(DAY, -45, SYSDATETIME()) THEN 1.1
                ELSE 0.8
              END
          )
          / NULLIF(
              SUM(
                CASE
                  WHEN bl.NgayTao >= DATEADD(DAY, -7, SYSDATETIME()) THEN 1.8
                  WHEN bl.NgayTao >= DATEADD(DAY, -21, SYSDATETIME()) THEN 1.4
                  WHEN bl.NgayTao >= DATEADD(DAY, -45, SYSDATETIME()) THEN 1.1
                  ELSE 0.8
                END
              ),
              0
            ),
          0
        ) AS weightedAvgScore,
        ISNULL(SUM(ISNULL(bl.TongSoCau, 0)), 0) AS totalQuestions,
        ISNULL(SUM(ISNULL(bl.SoCauSai, 0)), 0) AS totalWrong,
        MAX(bl.NgayTao) AS latestAt
      FROM dbo.BaiLamBaiTapAI bl
      INNER JOIN dbo.BaiTapAI bt ON bt.BaiTapAIId = bl.BaiTapAIId
      WHERE bl.NguoiDungId = @nguoiDungId
        AND bl.TrangThaiBaiLam IN (N'submitted', N'graded')
        AND bl.LanThu = 1
        AND bl.NgayTao >= DATEADD(DAY, -@withinDays, SYSDATETIME())
      GROUP BY bt.KieuBaiTap, bt.ChuDeBaiTap
      ORDER BY avgScore ASC, totalWrong DESC
    `);

    return result.recordset;
  }

  async listRecentExamCompletions(
    nguoiDungId: number,
    take = 20,
  ): Promise<ExamCompletionSnapshotRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);
    this.bindInput(request, "take", sql.Int, Math.max(1, Math.min(100, take)));

    const result = await request.query<ExamCompletionSnapshotRow>(`
      SELECT TOP (@take)
        bl.BaiLamDeThiAIId AS baiLamDeThiAIId,
        bl.DiemSo AS diemSo,
        bl.TongSoCau AS tongSoCau,
        bl.SoCauDung AS soCauDung,
        bl.SoCauSai AS soCauSai,
        bl.KetQuaChamJson AS ketQuaChamJson,
        bl.NgayTao AS ngayTao
      FROM dbo.BaiLamDeThiAI bl
      WHERE bl.NguoiDungId = @nguoiDungId
        AND bl.TrangThaiBaiLam IN (N'submitted', N'graded')
        AND bl.LanThu = 1
      ORDER BY bl.NgayTao DESC
    `);

    return result.recordset;
  }

  async replaceUserWeaknesses(nguoiDungId: number, weaknesses: UserWeaknessInput[]): Promise<void> {
    const pool = await getDbPool();
    const transaction = pool.transaction();
    let transactionStarted = false;

    try {
      await transaction.begin();
      transactionStarted = true;

      const deleteRequest = transaction.request();
      this.bindInput(deleteRequest, "nguoiDungId", sql.Int, nguoiDungId);
      await deleteRequest.query(`
        DELETE FROM dbo.DiemYeuNguoiDung
        WHERE NguoiDungId = @nguoiDungId
      `);

      for (const weakness of weaknesses) {
        const insertRequest = transaction.request();
        this.bindInput(insertRequest, "nguoiDungId", sql.Int, nguoiDungId);
        this.bindInput(insertRequest, "kieuBaiTap", sql.NVarChar(50), weakness.kieuBaiTap);
        this.bindInput(insertRequest, "chuDeBaiTap", sql.NVarChar(200), weakness.chuDeBaiTap ?? null);
        this.bindInput(insertRequest, "khaNang", sql.NVarChar(100), weakness.khaNang);
        this.bindInput(insertRequest, "moTaDiemYeu", sql.NVarChar(500), weakness.moTaDiemYeu);
        this.bindInput(insertRequest, "mucDoUuTien", sql.TinyInt, Math.max(1, Math.min(5, weakness.mucDoUuTien)));
        this.bindInput(insertRequest, "soLanXuatHien", sql.Int, Math.max(0, weakness.soLanXuatHien));
        this.bindInput(insertRequest, "soLanSai", sql.Int, Math.max(0, weakness.soLanSai));
        this.bindInput(insertRequest, "diemTrungBinh", sql.Decimal(5, 2), weakness.diemTrungBinh ?? null);

        await insertRequest.query(`
          INSERT INTO dbo.DiemYeuNguoiDung (
            NguoiDungId,
            KieuBaiTap,
            ChuDeBaiTap,
            KhaNang,
            MoTaDiemYeu,
            MucDoUuTien,
            SoLanXuatHien,
            SoLanSai,
            DiemTrungBinh,
            LanCapNhatCuoi
          )
          VALUES (
            @nguoiDungId,
            @kieuBaiTap,
            @chuDeBaiTap,
            @khaNang,
            @moTaDiemYeu,
            @mucDoUuTien,
            @soLanXuatHien,
            @soLanSai,
            @diemTrungBinh,
            SYSDATETIME()
          )
        `);
      }

      await transaction.commit();
      transactionStarted = false;
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

  async listUserWeaknesses(nguoiDungId: number, take = 12): Promise<UserWeaknessRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);
    this.bindInput(request, "take", sql.Int, Math.max(1, Math.min(50, take)));

    const result = await request.query<UserWeaknessRow>(`
      SELECT TOP (@take)
        dy.DiemYeuNguoiDungId AS diemYeuNguoiDungId,
        dy.NguoiDungId AS nguoiDungId,
        dy.KieuBaiTap AS kieuBaiTap,
        dy.ChuDeBaiTap AS chuDeBaiTap,
        dy.KhaNang AS khaNang,
        dy.MoTaDiemYeu AS moTaDiemYeu,
        dy.MucDoUuTien AS mucDoUuTien,
        dy.SoLanXuatHien AS soLanXuatHien,
        dy.SoLanSai AS soLanSai,
        dy.DiemTrungBinh AS diemTrungBinh,
        dy.LanCapNhatCuoi AS lanCapNhatCuoi
      FROM dbo.DiemYeuNguoiDung dy
      WHERE dy.NguoiDungId = @nguoiDungId
      ORDER BY dy.MucDoUuTien DESC, dy.SoLanSai DESC, dy.LanCapNhatCuoi DESC
    `);

    return result.recordset;
  }

  async archiveActiveRoadmaps(nguoiDungId: number): Promise<void> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);

    await request.query(`
      UPDATE dbo.LoTrinhHocTapAI
      SET TrangThai = N'archived',
          NgayCapNhat = SYSDATETIME()
      WHERE NguoiDungId = @nguoiDungId
        AND TrangThai = N'active'
    `);
  }

  async createRoadmap(input: {
    nguoiDungId: number;
    tenLoTrinh: string;
    duLieuJson: string;
    trangThai?: "active" | "archived" | "completed";
  }): Promise<number> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, input.nguoiDungId);
    this.bindInput(request, "tenLoTrinh", sql.NVarChar(200), input.tenLoTrinh);
    this.bindInput(request, "duLieuJson", sql.NVarChar(sql.MAX), input.duLieuJson);
    this.bindInput(request, "trangThai", sql.NVarChar(20), input.trangThai ?? "active");

    const result = await request.query<{ id: number }>(`
      INSERT INTO dbo.LoTrinhHocTapAI (
        NguoiDungId,
        TenLoTrinh,
        DuLieuJson,
        TrangThai,
        NgayCapNhat
      )
      OUTPUT INSERTED.LoTrinhHocTapAIId AS id
      VALUES (
        @nguoiDungId,
        @tenLoTrinh,
        @duLieuJson,
        @trangThai,
        SYSDATETIME()
      )
    `);

    return result.recordset[0]?.id ?? 0;
  }

  async getActiveRoadmap(nguoiDungId: number): Promise<LearningRoadmapRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);

    const result = await request.query<LearningRoadmapRow>(`
      SELECT TOP (1)
        lt.LoTrinhHocTapAIId AS loTrinhHocTapAIId,
        lt.NguoiDungId AS nguoiDungId,
        lt.TenLoTrinh AS tenLoTrinh,
        lt.DuLieuJson AS duLieuJson,
        lt.TrangThai AS trangThai,
        lt.NgayTao AS ngayTao,
        lt.NgayCapNhat AS ngayCapNhat
      FROM dbo.LoTrinhHocTapAI lt
      WHERE lt.NguoiDungId = @nguoiDungId
        AND lt.TrangThai = N'active'
      ORDER BY lt.NgayCapNhat DESC, lt.NgayTao DESC
    `);

    return result.recordset[0] ?? null;
  }

  async upsertRoadmapForNguoiDungId(input: {
    nguoiDungId: number;
    tenLoTrinh: string;
    duLieuJson: string;
  }): Promise<number> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, input.nguoiDungId);
    this.bindInput(request, "tenLoTrinh", sql.NVarChar(200), input.tenLoTrinh);
    this.bindInput(request, "duLieuJson", sql.NVarChar(sql.MAX), input.duLieuJson);

    const result = await request.query<RoadmapIdentityRow>(`
      DECLARE @selectedId INT;

      SELECT TOP (1)
        @selectedId = lt.LoTrinhHocTapAIId
      FROM dbo.LoTrinhHocTapAI lt
      WHERE lt.NguoiDungId = @nguoiDungId
      ORDER BY lt.NgayCapNhat DESC, lt.NgayTao DESC;

      IF @selectedId IS NULL
      BEGIN
        INSERT INTO dbo.LoTrinhHocTapAI (
          NguoiDungId,
          TenLoTrinh,
          DuLieuJson,
          TrangThai,
          NgayCapNhat
        )
        VALUES (
          @nguoiDungId,
          @tenLoTrinh,
          @duLieuJson,
          N'active',
          SYSDATETIME()
        );

        SET @selectedId = SCOPE_IDENTITY();
      END
      ELSE
      BEGIN
        UPDATE dbo.LoTrinhHocTapAI
        SET
          TenLoTrinh = @tenLoTrinh,
          DuLieuJson = @duLieuJson,
          TrangThai = N'active',
          NgayCapNhat = SYSDATETIME()
        WHERE LoTrinhHocTapAIId = @selectedId;
      END

      UPDATE dbo.LoTrinhHocTapAI
      SET
        TrangThai = N'archived',
        NgayCapNhat = SYSDATETIME()
      WHERE NguoiDungId = @nguoiDungId
        AND LoTrinhHocTapAIId <> @selectedId
        AND TrangThai = N'active';

      SELECT @selectedId AS loTrinhHocTapAIId;
    `);

    return result.recordset[0]?.loTrinhHocTapAIId ?? 0;
  }
}

export const learningInsightsRepository = new LearningInsightsRepository();
