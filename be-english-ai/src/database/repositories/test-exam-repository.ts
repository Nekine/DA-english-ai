import sql from "mssql";
import { BaseRepository } from "./base-repository";
import { getDbPool } from "../sqlserver/client";

export type TestExamDbRow = {
  deThiAIId: number;
  nguoiDungId: number;
  tenDeThi: string;
  kieuDeThi: string;
  tongSoPhan: number;
  tongSoBaiTap: number;
  noiDungJson: string;
  thoiGianLamDe: number;
  trangThaiDeThi: string;
  ngayTao: Date;
};

export type CreateTestExamDbInput = {
  nguoiDungId: number;
  tenDeThi: string;
  kieuDeThi: "placement" | "followup" | "practice";
  tongSoPhan: number;
  tongSoBaiTap: number;
  noiDungJson: string;
  thoiGianLamDe: number;
  trangThaiDeThi: "draft" | "generated" | "archived";
};

export type UpdateTestExamDbInput = {
  deThiAIId: number;
  tenDeThi: string;
  tongSoPhan: number;
  tongSoBaiTap: number;
  noiDungJson: string;
  thoiGianLamDe: number;
  trangThaiDeThi: "draft" | "generated" | "archived";
};

export type CreateTestExamCompletionInput = {
  deThiAIId: number;
  nguoiDungId: number;
  cauTraLoiJson: string;
  ketQuaChamJson: string;
  diemSo: number;
  tongSoCau: number;
  soCauDung: number;
  soCauSai: number;
  trinhDoNhanDinhAI?: string;
  thoiGianLamPhut?: number;
  nhanXetAI?: string;
  trangThaiBaiLam?: "in_progress" | "submitted" | "graded";
};

export type LearningExamCompletionRow = {
  baiLamDeThiAIId: number;
  nguoiDungId: number;
  deThiAIId: number;
  diemSo: number | null;
  tongSoCau: number | null;
  soCauDung: number | null;
  soCauSai: number | null;
  ketQuaChamJson: string | null;
  trangThaiBaiLam: string;
  ngayTao: Date;
};

export type TestExamCompletionPersistResult = {
  completionId: number;
  attemptNumber: number;
  persisted: boolean;
};

export class TestExamRepository extends BaseRepository {
  async createExam(input: CreateTestExamDbInput): Promise<number> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, input.nguoiDungId);
    this.bindInput(request, "tenDeThi", sql.NVarChar(200), input.tenDeThi);
    this.bindInput(request, "kieuDeThi", sql.NVarChar(30), input.kieuDeThi);
    this.bindInput(request, "tongSoPhan", sql.Int, input.tongSoPhan);
    this.bindInput(request, "tongSoBaiTap", sql.Int, input.tongSoBaiTap);
    this.bindInput(request, "noiDungJson", sql.NVarChar(sql.MAX), input.noiDungJson);
    this.bindInput(request, "thoiGianLamDe", sql.Int, input.thoiGianLamDe);
    this.bindInput(request, "trangThaiDeThi", sql.NVarChar(20), input.trangThaiDeThi);

    const result = await request.query<{ id: number }>(`
      INSERT INTO dbo.DeThiAI (
        NguoiDungId,
        TenDeThi,
        KieuDeThi,
        TongSoPhan,
        TongSoBaiTap,
        NoiDungJson,
        ThoiGianLamDe,
        TrangThaiDeThi
      )
      OUTPUT INSERTED.DeThiAIId AS id
      VALUES (
        @nguoiDungId,
        @tenDeThi,
        @kieuDeThi,
        @tongSoPhan,
        @tongSoBaiTap,
        @noiDungJson,
        @thoiGianLamDe,
        @trangThaiDeThi
      )
    `);

    return result.recordset[0]?.id ?? 0;
  }

  async updateExam(input: UpdateTestExamDbInput): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "deThiAIId", sql.Int, input.deThiAIId);
    this.bindInput(request, "tenDeThi", sql.NVarChar(200), input.tenDeThi);
    this.bindInput(request, "tongSoPhan", sql.Int, input.tongSoPhan);
    this.bindInput(request, "tongSoBaiTap", sql.Int, input.tongSoBaiTap);
    this.bindInput(request, "noiDungJson", sql.NVarChar(sql.MAX), input.noiDungJson);
    this.bindInput(request, "thoiGianLamDe", sql.Int, input.thoiGianLamDe);
    this.bindInput(request, "trangThaiDeThi", sql.NVarChar(20), input.trangThaiDeThi);

    const result = await request.query(`
      UPDATE dbo.DeThiAI
      SET
        TenDeThi = @tenDeThi,
        TongSoPhan = @tongSoPhan,
        TongSoBaiTap = @tongSoBaiTap,
        NoiDungJson = @noiDungJson,
        ThoiGianLamDe = @thoiGianLamDe,
        TrangThaiDeThi = @trangThaiDeThi
      WHERE DeThiAIId = @deThiAIId
    `);

    const affected = result.rowsAffected[0] ?? 0;
    return affected > 0;
  }

  async listByNguoiDungId(nguoiDungId: number, take: number): Promise<TestExamDbRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);
    this.bindInput(request, "take", sql.Int, take);

    const result = await request.query<TestExamDbRow>(`
      SELECT TOP (@take)
        dt.DeThiAIId AS deThiAIId,
        dt.NguoiDungId AS nguoiDungId,
        dt.TenDeThi AS tenDeThi,
        dt.KieuDeThi AS kieuDeThi,
        dt.TongSoPhan AS tongSoPhan,
        dt.TongSoBaiTap AS tongSoBaiTap,
        dt.NoiDungJson AS noiDungJson,
        dt.ThoiGianLamDe AS thoiGianLamDe,
        dt.TrangThaiDeThi AS trangThaiDeThi,
        dt.NgayTao AS ngayTao
      FROM dbo.DeThiAI dt
      WHERE dt.NguoiDungId = @nguoiDungId
      ORDER BY dt.NgayTao DESC
    `);

    return result.recordset;
  }

  async getByIdForUser(deThiAIId: number, nguoiDungId: number): Promise<TestExamDbRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "deThiAIId", sql.Int, deThiAIId);
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);

    const result = await request.query<TestExamDbRow>(`
      SELECT TOP (1)
        dt.DeThiAIId AS deThiAIId,
        dt.NguoiDungId AS nguoiDungId,
        dt.TenDeThi AS tenDeThi,
        dt.KieuDeThi AS kieuDeThi,
        dt.TongSoPhan AS tongSoPhan,
        dt.TongSoBaiTap AS tongSoBaiTap,
        dt.NoiDungJson AS noiDungJson,
        dt.ThoiGianLamDe AS thoiGianLamDe,
        dt.TrangThaiDeThi AS trangThaiDeThi,
        dt.NgayTao AS ngayTao
      FROM dbo.DeThiAI dt
      WHERE dt.DeThiAIId = @deThiAIId
        AND dt.NguoiDungId = @nguoiDungId
    `);

    return result.recordset[0] ?? null;
  }

  async getById(deThiAIId: number): Promise<TestExamDbRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "deThiAIId", sql.Int, deThiAIId);

    const result = await request.query<TestExamDbRow>(`
      SELECT TOP (1)
        dt.DeThiAIId AS deThiAIId,
        dt.NguoiDungId AS nguoiDungId,
        dt.TenDeThi AS tenDeThi,
        dt.KieuDeThi AS kieuDeThi,
        dt.TongSoPhan AS tongSoPhan,
        dt.TongSoBaiTap AS tongSoBaiTap,
        dt.NoiDungJson AS noiDungJson,
        dt.ThoiGianLamDe AS thoiGianLamDe,
        dt.TrangThaiDeThi AS trangThaiDeThi,
        dt.NgayTao AS ngayTao
      FROM dbo.DeThiAI dt
      WHERE dt.DeThiAIId = @deThiAIId
    `);

    return result.recordset[0] ?? null;
  }

  async addCompletion(input: CreateTestExamCompletionInput): Promise<TestExamCompletionPersistResult> {
    const pool = await getDbPool();
    const transaction = pool.transaction();
    let transactionStarted = false;

    try {
      await transaction.begin();
      transactionStarted = true;

      const attemptRequest = transaction.request();
      this.bindInput(attemptRequest, "deThiAIId", sql.Int, input.deThiAIId);
      this.bindInput(attemptRequest, "nguoiDungId", sql.Int, input.nguoiDungId);

      const existing = await attemptRequest.query<{ completionId: number; attemptNumber: number }>(`
        SELECT TOP (1)
          BaiLamDeThiAIId AS completionId,
          LanThu AS attemptNumber
        FROM dbo.BaiLamDeThiAI
        WITH (UPDLOCK, HOLDLOCK)
        WHERE NguoiDungId = @nguoiDungId
          AND DeThiAIId = @deThiAIId
        ORDER BY LanThu ASC, BaiLamDeThiAIId ASC
      `);

      const firstAttempt = existing.recordset[0];
      if (firstAttempt) {
        await transaction.commit();
        transactionStarted = false;
        return {
          completionId: Number(firstAttempt.completionId) || 0,
          attemptNumber: Number(firstAttempt.attemptNumber) || 1,
          persisted: false,
        };
      }

      const insertRequest = transaction.request();
      this.bindInput(insertRequest, "deThiAIId", sql.Int, input.deThiAIId);
      this.bindInput(insertRequest, "nguoiDungId", sql.Int, input.nguoiDungId);
      this.bindInput(insertRequest, "lanThu", sql.Int, 1);
      this.bindInput(insertRequest, "cauTraLoiJson", sql.NVarChar(sql.MAX), input.cauTraLoiJson);
      this.bindInput(insertRequest, "ketQuaChamJson", sql.NVarChar(sql.MAX), input.ketQuaChamJson);
      this.bindInput(insertRequest, "diemSo", sql.Decimal(5, 2), input.diemSo);
      this.bindInput(insertRequest, "tongSoCau", sql.Int, input.tongSoCau);
      this.bindInput(insertRequest, "soCauDung", sql.Int, input.soCauDung);
      this.bindInput(insertRequest, "soCauSai", sql.Int, input.soCauSai);
      this.bindInput(insertRequest, "trinhDoNhanDinhAI", sql.NVarChar(20), input.trinhDoNhanDinhAI ?? null);
      this.bindInput(insertRequest, "thoiGianLamPhut", sql.Int, input.thoiGianLamPhut ?? null);
      this.bindInput(insertRequest, "trangThaiBaiLam", sql.NVarChar(20), input.trangThaiBaiLam ?? "graded");
      this.bindInput(insertRequest, "nhanXetAI", sql.NVarChar(sql.MAX), input.nhanXetAI ?? null);

      const result = await insertRequest.query<{ id: number }>(`
        INSERT INTO dbo.BaiLamDeThiAI (
          DeThiAIId,
          NguoiDungId,
          LanThu,
          CauTraLoiJson,
          KetQuaChamJson,
          DiemSo,
          TongSoCau,
          SoCauDung,
          SoCauSai,
          TrinhDoNhanDinhAI,
          ThoiGianLamPhut,
          TrangThaiBaiLam,
          NhanXetAI
        )
        OUTPUT INSERTED.BaiLamDeThiAIId AS id
        VALUES (
          @deThiAIId,
          @nguoiDungId,
          @lanThu,
          @cauTraLoiJson,
          @ketQuaChamJson,
          @diemSo,
          @tongSoCau,
          @soCauDung,
          @soCauSai,
          @trinhDoNhanDinhAI,
          @thoiGianLamPhut,
          @trangThaiBaiLam,
          @nhanXetAI
        )
      `);

      await transaction.commit();
      transactionStarted = false;
      return {
        completionId: result.recordset[0]?.id ?? 0,
        attemptNumber: 1,
        persisted: true,
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

  async listRecentCompletionsByNguoiDungId(nguoiDungId: number, take: number): Promise<LearningExamCompletionRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, nguoiDungId);
    this.bindInput(request, "take", sql.Int, take);

    const result = await request.query<LearningExamCompletionRow>(`
      SELECT TOP (@take)
        bl.BaiLamDeThiAIId AS baiLamDeThiAIId,
        bl.NguoiDungId AS nguoiDungId,
        bl.DeThiAIId AS deThiAIId,
        bl.DiemSo AS diemSo,
        bl.TongSoCau AS tongSoCau,
        bl.SoCauDung AS soCauDung,
        bl.SoCauSai AS soCauSai,
        bl.KetQuaChamJson AS ketQuaChamJson,
        bl.TrangThaiBaiLam AS trangThaiBaiLam,
        bl.NgayTao AS ngayTao
      FROM dbo.BaiLamDeThiAI bl
      WHERE bl.NguoiDungId = @nguoiDungId
      ORDER BY bl.NgayTao DESC
    `);

    return result.recordset;
  }
}

export const testExamRepository = new TestExamRepository();
