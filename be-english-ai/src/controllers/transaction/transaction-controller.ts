import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import { getTransactionById, getTransactionList } from "../../services/transaction-service";

function toSortOrder(value: string | undefined): "asc" | "desc" {
  return value?.toLowerCase() === "asc" ? "asc" : "desc";
}

export async function getTransactionListHandler(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const searchTerm = (req.query.searchTerm as string | undefined)?.trim();
  const status = (req.query.status as string | undefined)?.trim().toLowerCase();
  const sortBy = ((req.query.sortBy as string | undefined)?.trim().toLowerCase() || "created_at");
  const sortOrder = toSortOrder(req.query.sortOrder as string | undefined);

  const startDateRaw = req.query.startDate as string | undefined;
  const endDateRaw = req.query.endDate as string | undefined;
  const startDate = startDateRaw ? new Date(startDateRaw) : undefined;
  const endDate = endDateRaw ? new Date(endDateRaw) : undefined;

  const result = await getTransactionList({
    page,
    pageSize,
    ...(searchTerm ? { searchTerm } : {}),
    ...(status ? { status } : {}),
    ...(startDate && !Number.isNaN(startDate.getTime()) ? { startDate } : {}),
    ...(endDate && !Number.isNaN(endDate.getTime()) ? { endDate } : {}),
    sortBy,
    sortOrder,
  });

  res.status(HTTP_STATUS.OK).json(result);
}

export async function getTransactionByIdHandler(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Transaction ID must be greater than 0" });
    return;
  }

  const result = await getTransactionById(id);
  if (!result) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: `Transaction with ID ${id} not found` });
    return;
  }

  res.status(HTTP_STATUS.OK).json(result);
}
