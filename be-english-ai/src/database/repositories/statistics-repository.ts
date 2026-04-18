import { BaseRepository } from "./base-repository";

export interface SystemStatisticsRow {
  TotalUsers: number;
  ActiveUsers: number;
  NewUsersThisMonth: number;
  TotalTests: number;
  TotalExercises: number;
  TotalCompletions: number;
  TotalRevenue: number;
  RevenueThisMonth: number;
  PendingPayments: number;
}

export interface UsersByRoleRow {
  Role: string;
  Count: number;
}

export interface UserGrowthRow {
  MonthNum: number;
  NewUsers: number;
  ActiveUsers: number;
}

export interface RevenuePaymentRow {
  Month: string;
  TotalPayments: number;
  CompletedPayments: number;
  PendingPayments: number;
  FailedPayments: number;
  Revenue: number;
  PendingAmount: number;
  FailedAmount: number;
}

export class StatisticsRepository extends BaseRepository {
  async getSystemStatistics(): Promise<SystemStatisticsRow> {
    const request = await this.createRequest();

    const result = await request.query<SystemStatisticsRow>(`
      SELECT
        (SELECT COUNT(1) FROM dbo.TaiKhoan) AS TotalUsers,
        (SELECT COUNT(1) FROM dbo.TaiKhoan WHERE TrangThaiTaiKhoan = N'active') AS ActiveUsers,
        (
          SELECT COUNT(1)
          FROM dbo.TaiKhoan
          WHERE YEAR(NgayTao) = YEAR(SYSDATETIME())
            AND MONTH(NgayTao) = MONTH(SYSDATETIME())
        ) AS NewUsersThisMonth,
        (SELECT COUNT(1) FROM dbo.DeThiAI) AS TotalTests,
        (
          SELECT COUNT(1)
          FROM dbo.BaiTapAI
          WHERE TrangThaiBaiTap <> N'archived'
        ) AS TotalExercises,
        (
          (SELECT COUNT(1) FROM dbo.BaiLamBaiTapAI WHERE TrangThaiBaiLam IN (N'submitted', N'graded'))
          +
          (SELECT COUNT(1) FROM dbo.BaiLamDeThiAI WHERE TrangThaiBaiLam IN (N'submitted', N'graded'))
        ) AS TotalCompletions,
        (
          SELECT ISNULL(SUM(CAST(SoTien AS FLOAT)), 0)
          FROM dbo.ThanhToan
          WHERE TrangThaiThanhToan = N'completed'
        ) AS TotalRevenue,
        (
          SELECT ISNULL(SUM(CAST(SoTien AS FLOAT)), 0)
          FROM dbo.ThanhToan
          WHERE TrangThaiThanhToan = N'completed'
            AND YEAR(NgayTao) = YEAR(SYSDATETIME())
            AND MONTH(NgayTao) = MONTH(SYSDATETIME())
        ) AS RevenueThisMonth,
        (
          SELECT COUNT(1)
          FROM dbo.ThanhToan
          WHERE TrangThaiThanhToan = N'pending'
        ) AS PendingPayments
    `);

    return (
      result.recordset[0] ?? {
        TotalUsers: 0,
        ActiveUsers: 0,
        NewUsersThisMonth: 0,
        TotalTests: 0,
        TotalExercises: 0,
        TotalCompletions: 0,
        TotalRevenue: 0,
        RevenueThisMonth: 0,
        PendingPayments: 0,
      }
    );
  }

  async getUsersByRole(): Promise<UsersByRoleRow[]> {
    const request = await this.createRequest();

    const result = await request.query<UsersByRoleRow>(`
      SELECT
        ISNULL(CAST(VaiTro AS NVARCHAR(20)), N'unknown') AS Role,
        COUNT(1) AS Count
      FROM dbo.TaiKhoan
      GROUP BY VaiTro
    `);

    return result.recordset;
  }

  async getUserGrowth(): Promise<UserGrowthRow[]> {
    const request = await this.createRequest();

    const result = await request.query<UserGrowthRow>(`
      SELECT
        MONTH(tk.NgayTao) AS MonthNum,
        COUNT(1) AS NewUsers,
        SUM(CASE WHEN tk.TrangThaiTaiKhoan = N'active' THEN 1 ELSE 0 END) AS ActiveUsers
      FROM dbo.TaiKhoan tk
      WHERE tk.NgayTao >= DATEADD(MONTH, -12, SYSDATETIME())
      GROUP BY MONTH(tk.NgayTao)
    `);

    return result.recordset;
  }

  async getRevenuePayment(): Promise<RevenuePaymentRow[]> {
    const request = await this.createRequest();

    const result = await request.query<RevenuePaymentRow>(`
      WITH MonthSeries AS (
        SELECT CAST(
          DATEFROMPARTS(
            YEAR(DATEADD(MONTH, -11, SYSDATETIME())),
            MONTH(DATEADD(MONTH, -11, SYSDATETIME())),
            1
          )
          AS DATETIME2(0)
        ) AS MonthStart
        UNION ALL
        SELECT DATEADD(MONTH, 1, MonthStart)
        FROM MonthSeries
        WHERE MonthStart < CAST(
          DATEFROMPARTS(YEAR(SYSDATETIME()), MONTH(SYSDATETIME()), 1)
          AS DATETIME2(0)
        )
      )
      SELECT
        CONVERT(CHAR(7), ms.MonthStart, 126) AS Month,
        COUNT(tt.ThanhToanId) AS TotalPayments,
        SUM(CASE WHEN tt.TrangThaiThanhToan = N'completed' THEN 1 ELSE 0 END) AS CompletedPayments,
        SUM(CASE WHEN tt.TrangThaiThanhToan = N'pending' THEN 1 ELSE 0 END) AS PendingPayments,
        SUM(CASE WHEN tt.TrangThaiThanhToan IN (N'failed', N'cancelled') THEN 1 ELSE 0 END) AS FailedPayments,
        ISNULL(SUM(CASE WHEN tt.TrangThaiThanhToan = N'completed' THEN CAST(tt.SoTien AS FLOAT) ELSE 0 END), 0) AS Revenue,
        ISNULL(SUM(CASE WHEN tt.TrangThaiThanhToan = N'pending' THEN CAST(tt.SoTien AS FLOAT) ELSE 0 END), 0) AS PendingAmount,
        ISNULL(SUM(CASE WHEN tt.TrangThaiThanhToan IN (N'failed', N'cancelled') THEN CAST(tt.SoTien AS FLOAT) ELSE 0 END), 0) AS FailedAmount
      FROM MonthSeries ms
      LEFT JOIN dbo.ThanhToan tt
        ON tt.NgayTao >= ms.MonthStart
       AND tt.NgayTao < DATEADD(MONTH, 1, ms.MonthStart)
      GROUP BY ms.MonthStart
      ORDER BY ms.MonthStart ASC
      OPTION (MAXRECURSION 12)
    `);

    return result.recordset;
  }
}
