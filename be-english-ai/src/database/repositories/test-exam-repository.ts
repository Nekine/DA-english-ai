import sql from "mssql";
import { BaseRepository } from "./base-repository";

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
}

export const testExamRepository = new TestExamRepository();
