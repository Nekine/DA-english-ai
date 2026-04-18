import sql from "mssql";
import { BaseRepository } from "./base-repository";

export interface PaymentRow {
  id: number;
  userId: number;
  email: string;
  fullName: string | null;
  amount: number;
  method: string | null;
  status: "pending" | "completed" | "failed";
  isLifetime: boolean;
  accountType: string;
  createdAt: Date;
}

export interface UserBasicRow {
  accountId: number;
  nguoiDungId: number | null;
  email: string;
  fullName: string | null;
  accountType: string;
  status: string;
  premiumExpiresAt: Date | null;
}

export class PaymentRepository extends BaseRepository {
  async getPayments(input: {
    page: number;
    pageSize: number;
    status?: "pending" | "completed" | "failed";
  }): Promise<{ rows: PaymentRow[]; totalCount: number }> {
    const request = await this.createRequest();
    const statusWhere =
      input.status === "failed"
        ? "tt.TrangThaiThanhToan IN (N'failed', N'cancelled')"
        : input.status
          ? "tt.TrangThaiThanhToan = @status"
          : "";
    const where = statusWhere ? `WHERE ${statusWhere}` : "";

    if (input.status && input.status !== "failed") {
      this.bindInput(request, "status", sql.NVarChar(20), input.status);
    }

    const countResult = await request.query<{ totalCount: number }>(`
      SELECT COUNT(1) AS totalCount
      FROM dbo.ThanhToan tt
      INNER JOIN dbo.NguoiDung nd ON nd.NguoiDungId = tt.NguoiDungId
      INNER JOIN dbo.TaiKhoan tk ON tk.TaiKhoanId = nd.TaiKhoanId
      ${where}
    `);

    const dataRequest = await this.createRequest();
    if (input.status && input.status !== "failed") {
      this.bindInput(dataRequest, "status", sql.NVarChar(20), input.status);
    }

    this.bindInput(dataRequest, "offset", sql.Int, (input.page - 1) * input.pageSize);
    this.bindInput(dataRequest, "pageSize", sql.Int, input.pageSize);

    const rowsResult = await dataRequest.query<PaymentRow>(`
      SELECT
        tt.ThanhToanId AS id,
        tk.TaiKhoanId AS userId,
        tk.Email AS email,
        nd.HoVaTen AS fullName,
        CAST(tt.SoTien AS FLOAT) AS amount,
        tt.PhuongThucThanhToan AS method,
        CAST(
          CASE
            WHEN tt.TrangThaiThanhToan = N'cancelled' THEN N'failed'
            ELSE tt.TrangThaiThanhToan
          END
          AS NVARCHAR(20)
        ) AS status,
        gd.LaTronDoi AS isLifetime,
        CAST(tk.LoaiTaiKhoan AS NVARCHAR(20)) AS accountType,
        tt.NgayTao AS createdAt
      FROM dbo.ThanhToan tt
      INNER JOIN dbo.NguoiDung nd ON nd.NguoiDungId = tt.NguoiDungId
      INNER JOIN dbo.TaiKhoan tk ON tk.TaiKhoanId = nd.TaiKhoanId
      INNER JOIN dbo.GoiDangKy gd ON gd.GoiDangKyId = tt.GoiDangKyId
      ${where}
      ORDER BY tt.NgayTao DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    return {
      rows: rowsResult.recordset,
      totalCount: countResult.recordset[0]?.totalCount ?? 0,
    };
  }

  async getExpiredPremiumUsers(now: Date, packageType: "all" | "pre" | "max" = "all"): Promise<UserBasicRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "now", sql.DateTime2(3), now);

    const accountTypeFilter =
      packageType === "max"
        ? "tk.LoaiTaiKhoan = N'max'"
        : packageType === "pre"
          ? "tk.LoaiTaiKhoan IN (N'premium', N'pre')"
          : "tk.LoaiTaiKhoan IN (N'premium', N'pre', N'max')";

    const result = await request.query<UserBasicRow>(`
      SELECT
        tk.TaiKhoanId AS accountId,
        nd.NguoiDungId AS nguoiDungId,
        tk.Email AS email,
        nd.HoVaTen AS fullName,
        CAST(tk.LoaiTaiKhoan AS NVARCHAR(20)) AS accountType,
        CAST(tk.TrangThaiTaiKhoan AS NVARCHAR(20)) AS status,
        sub.premiumExpiresAt
      FROM dbo.TaiKhoan tk
      INNER JOIN dbo.NguoiDung nd ON nd.TaiKhoanId = tk.TaiKhoanId
      OUTER APPLY (
        SELECT TOP (1)
          CASE
            WHEN gd.LaTronDoi = 1 THEN CAST(NULL AS DATETIME2)
            WHEN gd.ThoiHanThang IS NULL THEN CAST(NULL AS DATETIME2)
            ELSE DATEADD(MONTH, gd.ThoiHanThang, tt.NgayTao)
          END AS premiumExpiresAt
        FROM dbo.ThanhToan tt
        INNER JOIN dbo.GoiDangKy gd ON gd.GoiDangKyId = tt.GoiDangKyId
        WHERE tt.NguoiDungId = nd.NguoiDungId
          AND tt.TrangThaiThanhToan = N'completed'
        ORDER BY tt.NgayTao DESC, tt.ThanhToanId DESC
      ) sub
      WHERE ${accountTypeFilter}
        AND tk.TrangThaiTaiKhoan = N'active'
        AND sub.premiumExpiresAt IS NOT NULL
        AND sub.premiumExpiresAt <= @now
    `);

    return result.recordset;
  }

  async downgradeUsersToFree(accountIds: number[]): Promise<number> {
    if (accountIds.length === 0) {
      return 0;
    }

    const request = await this.createRequest();
    this.bindInput(request, "idsJson", sql.NVarChar(sql.MAX), JSON.stringify(accountIds));

    const result = await request.query(`
      UPDATE dbo.TaiKhoan
      SET LoaiTaiKhoan = N'basic',
          NgayCapNhat = SYSDATETIME()
      WHERE TaiKhoanId IN (
        SELECT TRY_CAST([value] AS INT)
        FROM OPENJSON(@idsJson)
      )
    `);

    return result.rowsAffected[0] ?? 0;
  }

  async getExpiringSoonUsers(now: Date, days: number, packageType: "all" | "pre" | "max" = "all"): Promise<UserBasicRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "now", sql.DateTime2(3), now);
    this.bindInput(request, "endDate", sql.DateTime2(3), new Date(now.getTime() + days * 86400000));

    const accountTypeFilter =
      packageType === "max"
        ? "tk.LoaiTaiKhoan = N'max'"
        : packageType === "pre"
          ? "tk.LoaiTaiKhoan IN (N'premium', N'pre')"
          : "tk.LoaiTaiKhoan IN (N'premium', N'pre', N'max')";

    const result = await request.query<UserBasicRow>(`
      SELECT
        tk.TaiKhoanId AS accountId,
        nd.NguoiDungId AS nguoiDungId,
        tk.Email AS email,
        nd.HoVaTen AS fullName,
        CAST(tk.LoaiTaiKhoan AS NVARCHAR(20)) AS accountType,
        CAST(tk.TrangThaiTaiKhoan AS NVARCHAR(20)) AS status,
        sub.premiumExpiresAt
      FROM dbo.TaiKhoan tk
      INNER JOIN dbo.NguoiDung nd ON nd.TaiKhoanId = tk.TaiKhoanId
      OUTER APPLY (
        SELECT TOP (1)
          CASE
            WHEN gd.LaTronDoi = 1 THEN CAST(NULL AS DATETIME2)
            WHEN gd.ThoiHanThang IS NULL THEN CAST(NULL AS DATETIME2)
            ELSE DATEADD(MONTH, gd.ThoiHanThang, tt.NgayTao)
          END AS premiumExpiresAt
        FROM dbo.ThanhToan tt
        INNER JOIN dbo.GoiDangKy gd ON gd.GoiDangKyId = tt.GoiDangKyId
        WHERE tt.NguoiDungId = nd.NguoiDungId
          AND tt.TrangThaiThanhToan = N'completed'
        ORDER BY tt.NgayTao DESC, tt.ThanhToanId DESC
      ) sub
      WHERE ${accountTypeFilter}
        AND tk.TrangThaiTaiKhoan = N'active'
        AND sub.premiumExpiresAt IS NOT NULL
        AND sub.premiumExpiresAt > @now
        AND sub.premiumExpiresAt <= @endDate
      ORDER BY sub.premiumExpiresAt ASC
    `);

    return result.recordset;
  }
}
