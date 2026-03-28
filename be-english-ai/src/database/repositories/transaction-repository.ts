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
  id: "p.id",
  amount: "p.amount",
  status: "p.status",
  created_at: "p.created_at",
  user_name: "u.full_name",
  user_email: "u.email",
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
      if (input.status) {
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
      parts.push("(u.full_name LIKE @searchTerm OR u.email LIKE @searchTerm OR CAST(p.id AS NVARCHAR(50)) LIKE @searchTerm)");
    }
    if (input.status) {
      parts.push("p.status = @status");
    }
    if (input.startDate) {
      parts.push("p.created_at >= @startDate");
    }
    if (input.endDate) {
      parts.push("p.created_at < @endDate");
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
      FROM dbo.payments p
      INNER JOIN dbo.users u ON u.id = p.user_id
      ${where}
    `);

    const summaryReq = await this.createRequest();
    bind(summaryReq);
    const summaryResult = await summaryReq.query<TransactionSummaryRow>(`
      SELECT
        COUNT(1) AS TotalCount,
        ISNULL(SUM(CASE WHEN p.status = N'completed' THEN CAST(p.amount AS FLOAT) ELSE 0 END), 0) AS TotalRevenue,
        SUM(CASE WHEN p.status = N'completed' THEN 1 ELSE 0 END) AS CompletedCount,
        SUM(CASE WHEN p.status = N'pending' THEN 1 ELSE 0 END) AS PendingCount,
        SUM(CASE WHEN p.status = N'failed' THEN 1 ELSE 0 END) AS FailedCount
      FROM dbo.payments p
      INNER JOIN dbo.users u ON u.id = p.user_id
      ${where}
    `);

    const dataReq = await this.createRequest();
    bind(dataReq);
    this.bindInput(dataReq, "offset", sql.Int, (input.page - 1) * input.pageSize);
    this.bindInput(dataReq, "pageSize", sql.Int, input.pageSize);

    const rowsResult = await dataReq.query<TransactionRow>(`
      SELECT
        CAST(p.id AS NVARCHAR(50)) AS Id,
        CAST(p.user_id AS NVARCHAR(50)) AS UserId,
        ISNULL(u.full_name, N'') AS UserName,
        u.email AS UserEmail,
        CAST(p.amount AS FLOAT) AS Amount,
        p.status AS Status,
        p.created_at AS CreatedAt,
        p.updated_at AS UpdatedAt
      FROM dbo.payments p
      INNER JOIN dbo.users u ON u.id = p.user_id
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
        CAST(p.id AS NVARCHAR(50)) AS Id,
        CAST(p.user_id AS NVARCHAR(50)) AS UserId,
        ISNULL(u.full_name, N'') AS UserName,
        u.email AS UserEmail,
        CAST(p.amount AS FLOAT) AS Amount,
        p.status AS Status,
        p.created_at AS CreatedAt,
        p.updated_at AS UpdatedAt,
        p.method AS PaymentMethod,
        p.transaction_history AS TransactionNotes,
        CASE WHEN p.package_id IS NULL THEN NULL ELSE CAST(p.package_id AS NVARCHAR(50)) END AS PackageId,
        p.is_lifetime AS IsLifetime
      FROM dbo.payments p
      INNER JOIN dbo.users u ON u.id = p.user_id
      WHERE p.id = @id
    `);

    return result.recordset[0] ?? null;
  }
}
