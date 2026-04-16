import sql from "mssql";
import { BaseRepository } from "./base-repository";

export interface UserListFilters {
  page: number;
  pageSize: number;
  accountType?: "basic" | "pre" | "max";
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
  CreatedAt: Date;
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
      if (filters.accountType === "basic") {
        whereParts.push("tk.LoaiTaiKhoan = N'basic'");
      } else if (filters.accountType === "pre") {
        whereParts.push("tk.LoaiTaiKhoan IN (N'premium', N'pre')");
      } else {
        whereParts.push("tk.LoaiTaiKhoan = N'max'");
      }
    }

    if (filters.search) {
      whereParts.push(
        "(nd.HoVaTen LIKE @search OR tk.TenDangNhap LIKE @search OR CAST(tk.TaiKhoanId AS NVARCHAR(20)) LIKE @search)",
      );
      this.bindInput(request, "search", sql.NVarChar(255), `%${filters.search}%`);
    }

    if (filters.status) {
      whereParts.push("tk.TrangThaiTaiKhoan = @status");
      this.bindInput(request, "status", sql.NVarChar(20), filters.status);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const countResult = await request.query<{ totalCount: number }>(`
      SELECT COUNT(1) AS totalCount
      FROM dbo.TaiKhoan tk
      LEFT JOIN dbo.NguoiDung nd ON nd.TaiKhoanId = tk.TaiKhoanId
      ${whereClause}
    `);

    const totalCount = countResult.recordset[0]?.totalCount ?? 0;
    const offset = (filters.page - 1) * filters.pageSize;

    const dataRequest = await this.createRequest();
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
        tk.TaiKhoanId AS UserID,
        tk.TenDangNhap AS Username,
        COALESCE(tk.Email, N'') AS Email,
        nd.SoDienThoai AS Phone,
        CASE
          WHEN tk.LoaiTaiKhoan = N'basic' THEN N'basic'
          WHEN tk.LoaiTaiKhoan IN (N'premium', N'pre') THEN N'pre'
          WHEN tk.LoaiTaiKhoan = N'max' THEN N'max'
          ELSE N'basic'
        END AS AccountType,
        tk.TrangThaiTaiKhoan AS Status,
        nd.HoVaTen AS FullName,
        nd.AnhDaiDienUrl AS Avatar,
        ISNULL(td.TongXP, 0) AS TotalXP,
        CAST(NULL AS DATETIME2) AS PremiumExpiresAt,
        tk.NgayTao AS CreatedAt
      FROM dbo.TaiKhoan tk
      LEFT JOIN dbo.NguoiDung nd ON nd.TaiKhoanId = tk.TaiKhoanId
      LEFT JOIN dbo.TienDoHocTap td ON td.NguoiDungId = nd.NguoiDungId
      ${whereClause}
      ORDER BY tk.TaiKhoanId ASC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    return { rows: dataResult.recordset, totalCount };
  }

  async getUserById(userId: number): Promise<UserDetailRow | null> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);

    const result = await request.query<UserDetailRow>(`
      SELECT TOP (1)
        tk.TaiKhoanId AS UserID,
        tk.TenDangNhap AS Username,
        COALESCE(tk.Email, N'') AS Email,
        nd.SoDienThoai AS Phone,
        CASE
          WHEN tk.LoaiTaiKhoan = N'basic' THEN N'basic'
          WHEN tk.LoaiTaiKhoan IN (N'premium', N'pre') THEN N'pre'
          WHEN tk.LoaiTaiKhoan = N'max' THEN N'max'
          ELSE N'basic'
        END AS AccountType,
        tk.TrangThaiTaiKhoan AS Status,
        nd.HoVaTen AS FullName,
        nd.TieuSu AS Bio,
        nd.DiaChi AS Address,
        nd.AnhDaiDienUrl AS Avatar,
        ISNULL(td.TongPhutHoc, 0) AS TotalStudyTime,
        ISNULL(td.TongXP, 0) AS TotalXP,
        CAST(NULL AS DATETIME2) AS PremiumExpiresAt,
        tk.LanDangNhapCuoi AS LastActiveAt,
        tk.NgayTao AS CreatedAt,
        tk.NgayCapNhat AS UpdatedAt
      FROM dbo.TaiKhoan tk
      LEFT JOIN dbo.NguoiDung nd ON nd.TaiKhoanId = tk.TaiKhoanId
      LEFT JOIN dbo.TienDoHocTap td ON td.NguoiDungId = nd.NguoiDungId
      WHERE tk.TaiKhoanId = @userId
    `);

    return result.recordset[0] ?? null;
  }

  async updateUserStatus(userId: number, status: "active" | "inactive" | "banned"): Promise<boolean> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);
    this.bindInput(request, "status", sql.NVarChar(20), status);

    const result = await request.query(`
      UPDATE dbo.TaiKhoan
      SET TrangThaiTaiKhoan = @status,
          NgayCapNhat = SYSUTCDATETIME()
      WHERE TaiKhoanId = @userId
    `);

    return (result.rowsAffected[0] ?? 0) > 0;
  }
}
