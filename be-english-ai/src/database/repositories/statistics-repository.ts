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
  MonthNum: number;
  TotalPayments: number;
  Revenue: number;
  PendingAmount: number;
  FailedAmount: number;
}

export class StatisticsRepository extends BaseRepository {
  async getSystemStatistics(): Promise<SystemStatisticsRow> {
    const request = await this.createRequest();

    const result = await request.query<SystemStatisticsRow>(`
      SELECT
        (SELECT COUNT(1) FROM dbo.users) AS TotalUsers,
        (SELECT COUNT(1) FROM dbo.users WHERE status = N'active') AS ActiveUsers,
        (
          SELECT COUNT(1)
          FROM dbo.users
          WHERE YEAR(created_at) = YEAR(SYSUTCDATETIME())
            AND MONTH(created_at) = MONTH(SYSUTCDATETIME())
        ) AS NewUsersThisMonth,
        (SELECT COUNT(1) FROM dbo.tests) AS TotalTests,
        (SELECT COUNT(1) FROM dbo.exercises) AS TotalExercises,
        (
          (SELECT COUNT(1) FROM dbo.exercise_completions)
          +
          (SELECT COUNT(1) FROM dbo.test_completions)
        ) AS TotalCompletions,
        (
          SELECT ISNULL(SUM(CAST(amount AS FLOAT)), 0)
          FROM dbo.payments
          WHERE status = N'completed'
        ) AS TotalRevenue,
        (
          SELECT ISNULL(SUM(CAST(amount AS FLOAT)), 0)
          FROM dbo.payments
          WHERE status = N'completed'
            AND YEAR(created_at) = YEAR(SYSUTCDATETIME())
            AND MONTH(created_at) = MONTH(SYSUTCDATETIME())
        ) AS RevenueThisMonth,
        (
          SELECT COUNT(1)
          FROM dbo.payments
          WHERE status = N'pending'
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
        ISNULL(role, N'unknown') AS Role,
        COUNT(1) AS Count
      FROM dbo.users
      GROUP BY role
    `);

    return result.recordset;
  }

  async getUserGrowth(): Promise<UserGrowthRow[]> {
    const request = await this.createRequest();

    const result = await request.query<UserGrowthRow>(`
      SELECT
        MONTH(created_at) AS MonthNum,
        COUNT(DISTINCT id) AS NewUsers,
        COUNT(DISTINCT CASE WHEN status = N'active' THEN id END) AS ActiveUsers
      FROM dbo.users
      WHERE created_at >= DATEADD(MONTH, -12, SYSUTCDATETIME())
      GROUP BY MONTH(created_at)
    `);

    return result.recordset;
  }

  async getRevenuePayment(): Promise<RevenuePaymentRow[]> {
    const request = await this.createRequest();

    const result = await request.query<RevenuePaymentRow>(`
      SELECT
        MONTH(created_at) AS MonthNum,
        COUNT(1) AS TotalPayments,
        ISNULL(SUM(CASE WHEN status = N'completed' THEN CAST(amount AS FLOAT) ELSE 0 END), 0) AS Revenue,
        ISNULL(SUM(CASE WHEN status = N'pending' THEN CAST(amount AS FLOAT) ELSE 0 END), 0) AS PendingAmount,
        ISNULL(SUM(CASE WHEN status = N'failed' THEN CAST(amount AS FLOAT) ELSE 0 END), 0) AS FailedAmount
      FROM dbo.payments
      WHERE created_at >= DATEADD(MONTH, -12, SYSUTCDATETIME())
      GROUP BY MONTH(created_at)
    `);

    return result.recordset;
  }
}
