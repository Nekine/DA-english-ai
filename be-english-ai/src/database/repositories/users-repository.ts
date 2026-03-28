import sql from "mssql";
import { BaseRepository } from "./base-repository";

export interface UserListFilters {
  page: number;
  pageSize: number;
  accountType?: "free" | "premium";
  search?: string;
  status?: "active" | "inactive" | "banned";
}

export interface UserListRow {
  UserID: number;
  Username: string;
  Email: string;
  Phone: string | null;
  AccountType: string;
  Status: string;
  FullName: string | null;
  Avatar: string | null;
  TotalXP: number;
  PremiumExpiresAt: Date | null;
}

export interface UserDetailRow {
  UserID: number;
  Username: string;
  Email: string;
  Phone: string | null;
  AccountType: string;
  Status: string;
  FullName: string | null;
  Bio: string | null;
  Address: string | null;
  Avatar: string | null;
  TotalStudyTime: number;
  TotalXP: number;
  PremiumExpiresAt: Date | null;
  LastActiveAt: Date | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export class UsersRepository extends BaseRepository {
  async getUsers(filters: UserListFilters): Promise<{ rows: UserListRow[]; totalCount: number }> {
    const request = await this.createRequest();
    const whereParts: string[] = [];

    if (filters.accountType) {
      whereParts.push("u.account_type = @accountType");
      this.bindInput(request, "accountType", sql.NVarChar(20), filters.accountType);
    }

    if (filters.search) {
      whereParts.push(
        "(u.full_name LIKE @search OR u.username LIKE @search OR CAST(u.id AS NVARCHAR(20)) LIKE @search)",
      );
      this.bindInput(request, "search", sql.NVarChar(255), `%${filters.search}%`);
    }

    if (filters.status) {
      whereParts.push("u.status = @status");
      this.bindInput(request, "status", sql.NVarChar(20), filters.status);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const countResult = await request.query<{ totalCount: number }>(`
      SELECT COUNT(1) AS totalCount
      FROM dbo.users u
      ${whereClause}
    `);

    const totalCount = countResult.recordset[0]?.totalCount ?? 0;
    const offset = (filters.page - 1) * filters.pageSize;

    const dataRequest = await this.createRequest();
    if (filters.accountType) {
      this.bindInput(dataRequest, "accountType", sql.NVarChar(20), filters.accountType);
    }
    if (filters.search) {
      this.bindInput(dataRequest, "search", sql.NVarChar(255), `%${filters.search}%`);
    }
    if (filters.status) {
      this.bindInput(dataRequest, "status", sql.NVarChar(20), filters.status);
    }
    this.bindInput(dataRequest, "pageSize", sql.Int, filters.pageSize);
    this.bindInput(dataRequest, "offset", sql.Int, offset);

    const dataResult = await dataRequest.query<UserListRow>(`
      SELECT
        u.id AS UserID,
        u.username AS Username,
        u.email AS Email,
        u.phone AS Phone,
        u.account_type AS AccountType,
        u.status AS Status,
        u.full_name AS FullName,
        u.avatar_url AS Avatar,
        u.total_xp AS TotalXP,
        u.premium_expires_at AS PremiumExpiresAt
      FROM dbo.users u
      ${whereClause}
      ORDER BY u.id DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    return { rows: dataResult.recordset, totalCount };
  }

  async getUserById(userId: number): Promise<UserDetailRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);

    const result = await request.query<UserDetailRow>(`
      SELECT TOP (1)
        id AS UserID,
        username AS Username,
        email AS Email,
        phone AS Phone,
        account_type AS AccountType,
        status AS Status,
        full_name AS FullName,
        bio AS Bio,
        address AS Address,
        avatar_url AS Avatar,
        total_study_time AS TotalStudyTime,
        total_xp AS TotalXP,
        premium_expires_at AS PremiumExpiresAt,
        last_active_at AS LastActiveAt,
        created_at AS CreatedAt,
        updated_at AS UpdatedAt
      FROM dbo.users
      WHERE id = @userId
    `);

    return result.recordset[0] ?? null;
  }
}
