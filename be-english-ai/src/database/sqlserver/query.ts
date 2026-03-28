import type { SqlPagingInput, SqlPagingOutput } from "./types";

export function normalizePaging(input: Partial<SqlPagingInput>): SqlPagingOutput {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    fetch: pageSize,
  };
}

export function buildOrderBy(column: string, order: "asc" | "desc"): string {
  return `ORDER BY ${column} ${order.toUpperCase()}`;
}

export function buildOffsetFetchClause(offset: number, fetch: number): string {
  return `OFFSET ${offset} ROWS FETCH NEXT ${fetch} ROWS ONLY`;
}
