import sql from "mssql";
import { BaseRepository } from "./base-repository";

export type PaymentRecordStatus = "pending" | "completed" | "failed" | "cancelled";

export interface PaymentUserRow {
  taiKhoanId: number;
  nguoiDungId: number;
  email: string;
  fullName: string | null;
  accountType: "basic" | "premium" | "max";
  status: "active" | "inactive" | "banned";
}

export interface GoiDangKyRow {
  goiDangKyId: number;
  tenGoi: string;
  moTa: string | null;
  gia: number;
  thoiHanThang: number | null;
  laTronDoi: boolean;
}

export interface PaymentRecordRow {
  thanhToanId: number;
  nguoiDungId: number;
  taiKhoanId: number;
  goiDangKyId: number;
  goiTen: string;
  goiThoiHanThang: number | null;
  goiLaTronDoi: boolean;
  soTien: number;
  phuongThucThanhToan: string | null;
  trangThaiThanhToan: PaymentRecordStatus;
  maGiaoDich: string | null;
  chiTietThanhToanJson: string | null;
  ngayTao: Date;
}

export class PayosPaymentRepository extends BaseRepository {
  async findUserByAccountId(taiKhoanId: number): Promise<PaymentUserRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "taiKhoanId", sql.Int, taiKhoanId);

    const result = await request.query<PaymentUserRow>(`
      SELECT TOP (1)
        tk.TaiKhoanId AS taiKhoanId,
        nd.NguoiDungId AS nguoiDungId,
        COALESCE(tk.Email, N'') AS email,
        nd.HoVaTen AS fullName,
        CAST(tk.LoaiTaiKhoan AS NVARCHAR(20)) AS accountType,
        CAST(tk.TrangThaiTaiKhoan AS NVARCHAR(20)) AS status
      FROM dbo.TaiKhoan tk
      INNER JOIN dbo.NguoiDung nd ON nd.TaiKhoanId = tk.TaiKhoanId
      WHERE tk.TaiKhoanId = @taiKhoanId
    `);

    return result.recordset[0] ?? null;
  }

  async findOrCreatePackage(input: {
    tenGoi: string;
    moTa: string;
    gia: number;
    thoiHanThang: number;
    laTronDoi: boolean;
  }): Promise<GoiDangKyRow> {
    const selectRequest = await this.createRequest();
    this.bindInput(selectRequest, "tenGoi", sql.NVarChar(100), input.tenGoi);
    this.bindInput(selectRequest, "gia", sql.Decimal(10, 2), input.gia);
    this.bindInput(selectRequest, "thoiHanThang", sql.Int, input.thoiHanThang);
    this.bindInput(selectRequest, "laTronDoi", sql.Bit, input.laTronDoi);

    const existing = await selectRequest.query<GoiDangKyRow>(`
      SELECT TOP (1)
        gd.GoiDangKyId AS goiDangKyId,
        gd.TenGoi AS tenGoi,
        gd.MoTa AS moTa,
        CAST(gd.Gia AS FLOAT) AS gia,
        gd.ThoiHanThang AS thoiHanThang,
        gd.LaTronDoi AS laTronDoi
      FROM dbo.GoiDangKy gd
      WHERE gd.DangSuDung = 1
        AND gd.TenGoi = @tenGoi
        AND gd.Gia = @gia
        AND COALESCE(gd.ThoiHanThang, 0) = COALESCE(@thoiHanThang, 0)
        AND gd.LaTronDoi = @laTronDoi
      ORDER BY gd.GoiDangKyId ASC
    `);

    if (existing.recordset[0]) {
      return existing.recordset[0];
    }

    const insertRequest = await this.createRequest();
    this.bindInput(insertRequest, "tenGoi", sql.NVarChar(100), input.tenGoi);
    this.bindInput(insertRequest, "moTa", sql.NVarChar(sql.MAX), input.moTa);
    this.bindInput(insertRequest, "gia", sql.Decimal(10, 2), input.gia);
    this.bindInput(insertRequest, "thoiHanThang", sql.Int, input.thoiHanThang);
    this.bindInput(insertRequest, "laTronDoi", sql.Bit, input.laTronDoi);

    const inserted = await insertRequest.query<{ goiDangKyId: number }>(`
      INSERT INTO dbo.GoiDangKy (
        TenGoi,
        MoTa,
        Gia,
        ThoiHanThang,
        LaTronDoi,
        DangSuDung,
        NgayTao
      )
      VALUES (
        @tenGoi,
        @moTa,
        @gia,
        @thoiHanThang,
        @laTronDoi,
        1,
        SYSDATETIME()
      );

      SELECT CAST(SCOPE_IDENTITY() AS INT) AS goiDangKyId;
    `);

    const goiDangKyId = inserted.recordset[0]?.goiDangKyId;
    if (!goiDangKyId) {
      throw new Error("Failed to create GoiDangKy record");
    }

    return {
      goiDangKyId,
      tenGoi: input.tenGoi,
      moTa: input.moTa,
      gia: input.gia,
      thoiHanThang: input.thoiHanThang,
      laTronDoi: input.laTronDoi,
    };
  }

  async createPendingPayment(input: {
    nguoiDungId: number;
    goiDangKyId: number;
    soTien: number;
    phuongThucThanhToan: string;
    maGiaoDich: string;
    chiTietThanhToanJson: string;
  }): Promise<number> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, input.nguoiDungId);
    this.bindInput(request, "goiDangKyId", sql.Int, input.goiDangKyId);
    this.bindInput(request, "soTien", sql.Decimal(10, 2), input.soTien);
    this.bindInput(request, "phuongThucThanhToan", sql.NVarChar(50), input.phuongThucThanhToan);
    this.bindInput(request, "maGiaoDich", sql.NVarChar(100), input.maGiaoDich);
    this.bindInput(request, "chiTietThanhToanJson", sql.NVarChar(sql.MAX), input.chiTietThanhToanJson);

    const result = await request.query<{ thanhToanId: number }>(`
      INSERT INTO dbo.ThanhToan (
        NguoiDungId,
        GoiDangKyId,
        SoTien,
        PhuongThucThanhToan,
        TrangThaiThanhToan,
        MaGiaoDich,
        ChiTietThanhToanJson,
        NgayTao
      )
      VALUES (
        @nguoiDungId,
        @goiDangKyId,
        @soTien,
        @phuongThucThanhToan,
        N'pending',
        @maGiaoDich,
        @chiTietThanhToanJson,
        SYSDATETIME()
      );

      SELECT CAST(SCOPE_IDENTITY() AS INT) AS thanhToanId;
    `);

    const thanhToanId = result.recordset[0]?.thanhToanId;
    if (!thanhToanId) {
      throw new Error("Failed to create ThanhToan record");
    }

    return thanhToanId;
  }

  async getPaymentByOrderCode(orderCode: string): Promise<PaymentRecordRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "orderCode", sql.NVarChar(100), orderCode);

    const result = await request.query<PaymentRecordRow>(`
      SELECT TOP (1)
        tt.ThanhToanId AS thanhToanId,
        tt.NguoiDungId AS nguoiDungId,
        nd.TaiKhoanId AS taiKhoanId,
        tt.GoiDangKyId AS goiDangKyId,
        gd.TenGoi AS goiTen,
        gd.ThoiHanThang AS goiThoiHanThang,
        gd.LaTronDoi AS goiLaTronDoi,
        CAST(tt.SoTien AS FLOAT) AS soTien,
        tt.PhuongThucThanhToan AS phuongThucThanhToan,
        CAST(tt.TrangThaiThanhToan AS NVARCHAR(20)) AS trangThaiThanhToan,
        tt.MaGiaoDich AS maGiaoDich,
        tt.ChiTietThanhToanJson AS chiTietThanhToanJson,
        tt.NgayTao AS ngayTao
      FROM dbo.ThanhToan tt
      INNER JOIN dbo.NguoiDung nd ON nd.NguoiDungId = tt.NguoiDungId
      INNER JOIN dbo.GoiDangKy gd ON gd.GoiDangKyId = tt.GoiDangKyId
      WHERE tt.MaGiaoDich = @orderCode
      ORDER BY tt.ThanhToanId DESC
    `);

    return result.recordset[0] ?? null;
  }

  async updatePaymentDetails(orderCode: string, detailsJson: string): Promise<void> {
    const request = await this.createRequest();
    this.bindInput(request, "orderCode", sql.NVarChar(100), orderCode);
    this.bindInput(request, "detailsJson", sql.NVarChar(sql.MAX), detailsJson);

    await request.query(`
      UPDATE dbo.ThanhToan
      SET ChiTietThanhToanJson = @detailsJson
      WHERE MaGiaoDich = @orderCode
    `);
  }

  async updatePaymentStatus(input: {
    orderCode: string;
    status: PaymentRecordStatus;
    detailsJson: string;
    paymentMethod: string;
  }): Promise<void> {
    const request = await this.createRequest();
    this.bindInput(request, "orderCode", sql.NVarChar(100), input.orderCode);
    this.bindInput(request, "status", sql.NVarChar(20), input.status);
    this.bindInput(request, "detailsJson", sql.NVarChar(sql.MAX), input.detailsJson);
    this.bindInput(request, "paymentMethod", sql.NVarChar(50), input.paymentMethod);

    await request.query(`
      UPDATE dbo.ThanhToan
      SET TrangThaiThanhToan = @status,
          ChiTietThanhToanJson = @detailsJson,
          PhuongThucThanhToan = @paymentMethod
      WHERE MaGiaoDich = @orderCode
    `);
  }

  async updateAccountTypeByNguoiDungId(input: {
    nguoiDungId: number;
    accountType: "premium" | "max";
  }): Promise<void> {
    const request = await this.createRequest();
    this.bindInput(request, "nguoiDungId", sql.Int, input.nguoiDungId);
    this.bindInput(request, "accountType", sql.NVarChar(20), input.accountType);

    await request.query(`
      UPDATE tk
      SET tk.LoaiTaiKhoan = @accountType,
          tk.NgayCapNhat = SYSDATETIME()
      FROM dbo.TaiKhoan tk
      INNER JOIN dbo.NguoiDung nd ON nd.TaiKhoanId = tk.TaiKhoanId
      WHERE nd.NguoiDungId = @nguoiDungId
    `);
  }
}

export const payosPaymentRepository = new PayosPaymentRepository();
