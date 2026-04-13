import sql from "mssql";
import { BaseRepository } from "./base-repository";

export interface LeaderboardRow {
  Rank: number;
  UserID: number;
  Username: string;
  FullName: string | null;
  Avatar: string | null;
  TotalXP: number;
  AttendanceStars: number;
  ExercisesCompleted: number;
  ExamsCompleted: number;
  TotalAssignmentsAndExams: number;
  LastActiveAt: Date | null;
}

export interface LeaderboardFilters {
  limit: number;
  timeFilter?: string;
  search?: string;
}

export interface LeaderboardCountResult {
  filteredCount: number;
  systemCount: number;
}

export class LeaderboardRepository extends BaseRepository {
  async getLeaderboard(filters: LeaderboardFilters): Promise<LeaderboardRow[]> {
    const request = await this.createRequest();
    this.bindInput(request, "limit", sql.Int, filters.limit);

    const whereParts = ["tk.TrangThaiTaiKhoan = N'active'"];
    const lastActiveExpr = "COALESCE(td.CapNhatLuc, tk.LanDangNhapCuoi, tk.NgayCapNhat, tk.NgayTao)";
    const totalAssignmentsAndExamsExpr = "ISNULL(COALESCE(td.TongBaiHoanThanh, td.TongBaiDaLam, 0), 0)";
    const examsCompletedExpr = "ISNULL(td.TongDeThiDaLam, 0)";

    if (filters.timeFilter === "today") {
      whereParts.push(`${lastActiveExpr} >= DATEADD(DAY, -1, SYSDATETIME())`);
    } else if (filters.timeFilter === "week") {
      whereParts.push(`${lastActiveExpr} >= DATEADD(DAY, -7, SYSDATETIME())`);
    } else if (filters.timeFilter === "month") {
      whereParts.push(`${lastActiveExpr} >= DATEADD(DAY, -30, SYSDATETIME())`);
    }

    if (filters.search) {
      whereParts.push("(tk.TenDangNhap LIKE @search OR ISNULL(nd.HoVaTen, N'') LIKE @search)");
      this.bindInput(request, "search", sql.NVarChar(255), `%${filters.search}%`);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const result = await request.query<LeaderboardRow>(`
      WITH ranked_users AS (
        SELECT
          ROW_NUMBER() OVER (
            ORDER BY
              ISNULL(td.TongXP, 0) DESC,
              ${totalAssignmentsAndExamsExpr} DESC,
              tk.TaiKhoanId ASC
          ) AS Rank,
          tk.TaiKhoanId AS UserID,
          tk.TenDangNhap AS Username,
          nd.HoVaTen AS FullName,
          nd.AnhDaiDienUrl AS Avatar,
          ISNULL(td.TongXP, 0) AS TotalXP,
          ISNULL(attendance.AttendanceStars, 0) AS AttendanceStars,
          CASE
            WHEN ${totalAssignmentsAndExamsExpr} > ${examsCompletedExpr}
              THEN ${totalAssignmentsAndExamsExpr} - ${examsCompletedExpr}
            ELSE 0
          END AS ExercisesCompleted,
          ${examsCompletedExpr} AS ExamsCompleted,
          ${totalAssignmentsAndExamsExpr} AS TotalAssignmentsAndExams,
          ${lastActiveExpr} AS LastActiveAt
        FROM dbo.TaiKhoan tk
        LEFT JOIN dbo.NguoiDung nd ON nd.TaiKhoanId = tk.TaiKhoanId
        LEFT JOIN dbo.TienDoHocTap td ON td.NguoiDungId = nd.NguoiDungId
        OUTER APPLY (
          SELECT COUNT(1) AS AttendanceStars
          FROM dbo.DiemDanhNgay dd
          WHERE dd.NguoiDungId = nd.NguoiDungId
        ) attendance
        ${whereClause}
      )
      SELECT TOP (@limit)
        Rank,
        UserID,
        Username,
        FullName,
        Avatar,
        TotalXP,
        AttendanceStars,
        ExercisesCompleted,
        ExamsCompleted,
        TotalAssignmentsAndExams,
        LastActiveAt
      FROM ranked_users
      ORDER BY Rank ASC
    `);

    return result.recordset;
  }

  async getUserRank(userId: number): Promise<number | null> {
    const request = await this.createRequest();
    this.bindInput(request, "userId", sql.Int, userId);

    const result = await request.query<{ Rank: number }>(`
      WITH ranked_users AS (
        SELECT
          ROW_NUMBER() OVER (
            ORDER BY
              ISNULL(td.TongXP, 0) DESC,
              ISNULL(COALESCE(td.TongBaiHoanThanh, td.TongBaiDaLam, 0), 0) DESC,
              tk.TaiKhoanId ASC
          ) AS Rank,
          tk.TaiKhoanId AS UserID
        FROM dbo.TaiKhoan tk
        LEFT JOIN dbo.NguoiDung nd ON nd.TaiKhoanId = tk.TaiKhoanId
        LEFT JOIN dbo.TienDoHocTap td ON td.NguoiDungId = nd.NguoiDungId
        WHERE tk.TrangThaiTaiKhoan = N'active'
      )
      SELECT TOP (1) Rank
      FROM ranked_users
      WHERE UserID = @userId
    `);

    return result.recordset[0]?.Rank ?? null;
  }

  async getCounts(filters: Omit<LeaderboardFilters, "limit">): Promise<LeaderboardCountResult> {
    const filteredRequest = await this.createRequest();

    const whereParts = ["tk.TrangThaiTaiKhoan = N'active'"];
    const lastActiveExpr = "COALESCE(td.CapNhatLuc, tk.LanDangNhapCuoi, tk.NgayCapNhat, tk.NgayTao)";

    if (filters.timeFilter === "today") {
      whereParts.push(`${lastActiveExpr} >= DATEADD(DAY, -1, SYSDATETIME())`);
    } else if (filters.timeFilter === "week") {
      whereParts.push(`${lastActiveExpr} >= DATEADD(DAY, -7, SYSDATETIME())`);
    } else if (filters.timeFilter === "month") {
      whereParts.push(`${lastActiveExpr} >= DATEADD(DAY, -30, SYSDATETIME())`);
    }

    if (filters.search) {
      whereParts.push("(tk.TenDangNhap LIKE @search OR ISNULL(nd.HoVaTen, N'') LIKE @search)");
      this.bindInput(filteredRequest, "search", sql.NVarChar(255), `%${filters.search}%`);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const filteredResult = await filteredRequest.query<{ totalCount: number }>(`
      SELECT COUNT(1) AS totalCount
      FROM dbo.TaiKhoan tk
      LEFT JOIN dbo.NguoiDung nd ON nd.TaiKhoanId = tk.TaiKhoanId
      LEFT JOIN dbo.TienDoHocTap td ON td.NguoiDungId = nd.NguoiDungId
      ${whereClause}
    `);

    const systemRequest = await this.createRequest();
    const systemResult = await systemRequest.query<{ totalCount: number }>(`
      SELECT COUNT(1) AS totalCount
      FROM dbo.NguoiDung nd
    `);

    return {
      filteredCount: Number(filteredResult.recordset[0]?.totalCount ?? 0),
      systemCount: Number(systemResult.recordset[0]?.totalCount ?? 0),
    };
  }
}

export const leaderboardRepository = new LeaderboardRepository();
