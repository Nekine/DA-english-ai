import { TransactionRepository } from "../database/repositories/transaction-repository";

const transactionRepository = new TransactionRepository();

export async function getTransactionList(input: {
  page: number;
  pageSize: number;
  searchTerm?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy: string;
  sortOrder: "asc" | "desc";
}) {
  const result = await transactionRepository.getList(input);

  return {
    Transactions: result.rows.map((r) => ({
      ...r,
      CreatedAt: r.CreatedAt.toISOString(),
      UpdatedAt: r.UpdatedAt.toISOString(),
    })),
    TotalCount: result.totalCount,
    Page: input.page,
    PageSize: input.pageSize,
    TotalPages: Math.ceil(result.totalCount / input.pageSize),
    Summary: {
      TotalRevenue: Number(result.summary.TotalRevenue || 0),
      TransactionCount: result.summary.TotalCount,
      AverageTransaction:
        result.summary.TotalCount > 0
          ? Number(result.summary.TotalRevenue || 0) / result.summary.TotalCount
          : 0,
      CompletedCount: result.summary.CompletedCount,
      PendingCount: result.summary.PendingCount,
      FailedCount: result.summary.FailedCount,
    },
  };
}

export async function getTransactionById(id: number) {
  const tx = await transactionRepository.getById(id);
  if (!tx) {
    return null;
  }

  return {
    ...tx,
    CreatedAt: tx.CreatedAt.toISOString(),
    UpdatedAt: tx.UpdatedAt.toISOString(),
  };
}
