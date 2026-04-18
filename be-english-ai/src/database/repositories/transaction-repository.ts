import sql from "mssql";
import { BaseRepository } from "./base-repository";

export interface TransactionRow {
  Id: string;
  UserId: string;
  UserName: string;
  UserEmail: string;
  Amount: number;
  Status: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface TransactionDetailRow extends TransactionRow {
  PaymentMethod: string | null;
  TransactionNotes: string | null;
  PackageId: string | null;
  IsLifetime: boolean;
}

export interface TransactionSummaryRow {
  TotalCount: number;
  TotalRevenue: number;
  CompletedCount: number;
  PendingCount: number;
  FailedCount: number;
}

const SORT_MAP: Record<string, string> = {
  id: "tt.ThanhToanId",
  amount: "tt.SoTien",
  status: "CASE WHEN tt.TrangThaiThanhToan = N'cancelled' THEN N'failed' ELSE tt.TrangThaiThanhToan END",
  created_at: "tt.NgayTao",
  user_name: "nd.HoVaTen",
  user_email: "tk.Email",
};

export class TransactionRepository extends BaseRepository {
  private buildWhere(input: {
    searchTerm?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): { where: string; bind: (request: sql.Request) => void } {
    const parts: string[] = [];

    const bind = (request: sql.Request): void => {
      if (input.searchTerm) {
        this.bindInput(request, "searchTerm", sql.NVarChar(255), `%${input.searchTerm}%`);
      }
      if (input.status && input.status !== "failed") {
        this.bindInput(request, "status", sql.NVarChar(20), input.status);
      }
      if (input.startDate) {
        this.bindInput(request, "startDate", sql.DateTime2(3), input.startDate);
      }
      if (input.endDate) {
        this.bindInput(request, "endDate", sql.DateTime2(3), new Date(input.endDate.getTime() + 86400000));
      }
    };

    if (input.searchTerm) {
      parts.push("(nd.HoVaTen LIKE @searchTerm OR tk.Email LIKE @searchTerm OR CAST(tt.ThanhToanId AS NVARCHAR(50)) LIKE @searchTerm OR tt.MaGiaoDich LIKE @searchTerm)");
    }
    if (input.status) {
      if (input.status === "failed") {
        parts.push("tt.TrangThaiThanhToan IN (N'failed', N'cancelled')");
      } else {
        parts.push("tt.TrangThaiThanhToan = @status");
      }
    }
    if (input.startDate) {
      parts.push("tt.NgayTao >= @startDate");
    }
    if (input.endDate) {
      parts.push("tt.NgayTao < @endDate");
    }

    return {
      where: parts.length > 0 ? `WHERE ${parts.join(" AND ")}` : "",
      bind,
    };
  }

  async getList(input: {
    page: number;
    pageSize: number;
    searchTerm?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    sortBy: string;
    sortOrder: "asc" | "desc";
  }): Promise<{
    totalCount: number;
    summary: TransactionSummaryRow;
    rows: TransactionRow[];
  }> {
    const { where, bind } = this.buildWhere(input);
    const sortColumn = SORT_MAP[input.sortBy] ?? SORT_MAP.created_at;

    const countReq = await this.createRequest();
    bind(countReq);
    const countResult = await countReq.query<{ totalCount: number }>(`
      SELECT COUNT(1) AS totalCount
      FROM dbo.ThanhToan tt
      INNER JOIN dbo.NguoiDung nd ON nd.NguoiDungId = tt.NguoiDungId
      INNER JOIN dbo.TaiKhoan tk ON tk.TaiKhoanId = nd.TaiKhoanId
      ${where}
    `);

    const summaryReq = await this.createRequest();
    bind(summaryReq);
    const summaryResult = await summaryReq.query<TransactionSummaryRow>(`
      SELECT
        COUNT(1) AS TotalCount,
        ISNULL(SUM(CASE WHEN tt.TrangThaiThanhToan = N'completed' THEN CAST(tt.SoTien AS FLOAT) ELSE 0 END), 0) AS TotalRevenue,
        SUM(CASE WHEN tt.TrangThaiThanhToan = N'completed' THEN 1 ELSE 0 END) AS CompletedCount,
        SUM(CASE WHEN tt.TrangThaiThanhToan = N'pending' THEN 1 ELSE 0 END) AS PendingCount,
        SUM(CASE WHEN tt.TrangThaiThanhToan IN (N'failed', N'cancelled') THEN 1 ELSE 0 END) AS FailedCount
      FROM dbo.ThanhToan tt
      INNER JOIN dbo.NguoiDung nd ON nd.NguoiDungId = tt.NguoiDungId
      INNER JOIN dbo.TaiKhoan tk ON tk.TaiKhoanId = nd.TaiKhoanId
      ${where}
    `);

    const dataReq = await this.createRequest();
    bind(dataReq);
    this.bindInput(dataReq, "offset", sql.Int, (input.page - 1) * input.pageSize);
    this.bindInput(dataReq, "pageSize", sql.Int, input.pageSize);

    const rowsResult = await dataReq.query<TransactionRow>(`
      SELECT
        CAST(tt.ThanhToanId AS NVARCHAR(50)) AS Id,
        CAST(tk.TaiKhoanId AS NVARCHAR(50)) AS UserId,
        ISNULL(nd.HoVaTen, N'') AS UserName,
        ISNULL(tk.Email, N'') AS UserEmail,
        CAST(tt.SoTien AS FLOAT) AS Amount,
        CAST(
          CASE
            WHEN tt.TrangThaiThanhToan = N'cancelled' THEN N'failed'
            ELSE tt.TrangThaiThanhToan
          END
          AS NVARCHAR(20)
        ) AS Status,
        tt.NgayTao AS CreatedAt,
        COALESCE(
          TRY_CAST(JSON_VALUE(tt.ChiTietThanhToanJson, '$.updatedAt') AS DATETIME2(3)),
          tt.NgayTao
        ) AS UpdatedAt
      FROM dbo.ThanhToan tt
      INNER JOIN dbo.NguoiDung nd ON nd.NguoiDungId = tt.NguoiDungId
      INNER JOIN dbo.TaiKhoan tk ON tk.TaiKhoanId = nd.TaiKhoanId
      ${where}
      ORDER BY ${sortColumn} ${input.sortOrder.toUpperCase()}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    return {
      totalCount: countResult.recordset[0]?.totalCount ?? 0,
      summary:
        summaryResult.recordset[0] ?? {
          TotalCount: 0,
          TotalRevenue: 0,
          CompletedCount: 0,
          PendingCount: 0,
          FailedCount: 0,
        },
      rows: rowsResult.recordset,
    };
  }

  async getById(id: number): Promise<TransactionDetailRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "id", sql.Int, id);

    const result = await request.query<TransactionDetailRow>(`
      SELECT TOP (1)
        CAST(tt.ThanhToanId AS NVARCHAR(50)) AS Id,
        CAST(tk.TaiKhoanId AS NVARCHAR(50)) AS UserId,
        ISNULL(nd.HoVaTen, N'') AS UserName,
        ISNULL(tk.Email, N'') AS UserEmail,
        CAST(tt.SoTien AS FLOAT) AS Amount,
        CAST(
          CASE
            WHEN tt.TrangThaiThanhToan = N'cancelled' THEN N'failed'
            ELSE tt.TrangThaiThanhToan
          END
          AS NVARCHAR(20)
        ) AS Status,
        tt.NgayTao AS CreatedAt,
        COALESCE(
          TRY_CAST(JSON_VALUE(tt.ChiTietThanhToanJson, '$.updatedAt') AS DATETIME2(3)),
          tt.NgayTao
        ) AS UpdatedAt,
        tt.PhuongThucThanhToan AS PaymentMethod,
        tt.ChiTietThanhToanJson AS TransactionNotes,
        CAST(tt.GoiDangKyId AS NVARCHAR(50)) AS PackageId,
        gd.LaTronDoi AS IsLifetime
      FROM dbo.ThanhToan tt
      INNER JOIN dbo.NguoiDung nd ON nd.NguoiDungId = tt.NguoiDungId
      INNER JOIN dbo.TaiKhoan tk ON tk.TaiKhoanId = nd.TaiKhoanId
      INNER JOIN dbo.GoiDangKy gd ON gd.GoiDangKyId = tt.GoiDangKyId
      WHERE tt.ThanhToanId = @id
    `);

    return result.recordset[0] ?? null;
  }
}
