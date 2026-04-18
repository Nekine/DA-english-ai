import {
  StatisticsRepository,
  type RevenuePaymentRow,
  type UserGrowthRow,
} from "../database/repositories/statistics-repository";

const statisticsRepository = new StatisticsRepository();

export interface SystemStatisticsDto {
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

export interface UserGrowthDataDto {
  Month: string;
  NewUsers: number;
  ActiveUsers: number;
}

export interface RevenuePaymentDataDto {
  Month: string;
  Revenue: number;
  TotalPayments: number;
  CompletedPayments: number;
  PendingPayments: number;
  FailedPayments: number;
  PendingAmount: number;
  FailedAmount: number;
}

function padUserGrowthMonths(rows: UserGrowthRow[]): UserGrowthDataDto[] {
  const byMonth = new Map<number, UserGrowthDataDto>();

  for (const row of rows) {
    byMonth.set(row.MonthNum, {
      Month: `T${row.MonthNum}`,
      NewUsers: row.NewUsers,
      ActiveUsers: row.ActiveUsers,
    });
  }

  const normalized: UserGrowthDataDto[] = [];
  for (let month = 1; month <= 12; month += 1) {
    normalized.push(
      byMonth.get(month) ?? {
        Month: `T${month}`,
        NewUsers: 0,
        ActiveUsers: 0,
      },
    );
  }

  return normalized;
}

function mapRevenuePaymentMonths(rows: RevenuePaymentRow[]): RevenuePaymentDataDto[] {
  return rows.map((row) => ({
    Month: row.Month,
    Revenue: Number(row.Revenue || 0),
    TotalPayments: Number(row.TotalPayments || 0),
    CompletedPayments: Number(row.CompletedPayments || 0),
    PendingPayments: Number(row.PendingPayments || 0),
    FailedPayments: Number(row.FailedPayments || 0),
    PendingAmount: Number(row.PendingAmount || 0),
    FailedAmount: Number(row.FailedAmount || 0),
  }));
}

export async function getSystemStatistics(): Promise<SystemStatisticsDto> {
  const row = await statisticsRepository.getSystemStatistics();

  return {
    TotalUsers: row.TotalUsers,
    ActiveUsers: row.ActiveUsers,
    NewUsersThisMonth: row.NewUsersThisMonth,
    TotalTests: row.TotalTests,
    TotalExercises: row.TotalExercises,
    TotalCompletions: row.TotalCompletions,
    TotalRevenue: Number(row.TotalRevenue || 0),
    RevenueThisMonth: Number(row.RevenueThisMonth || 0),
    PendingPayments: row.PendingPayments,
  };
}

export async function getUsersByRole(): Promise<Record<string, number>> {
  const rows = await statisticsRepository.getUsersByRole();

  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.Role] = row.Count;
    return acc;
  }, {});
}

export async function getUserGrowth(): Promise<UserGrowthDataDto[]> {
  const rows = await statisticsRepository.getUserGrowth();
  return padUserGrowthMonths(rows);
}

export async function getRevenuePayment(): Promise<RevenuePaymentDataDto[]> {
  const rows = await statisticsRepository.getRevenuePayment();
  return mapRevenuePaymentMonths(rows);
}
