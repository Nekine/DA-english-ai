import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import {
  checkExpiredPremium,
  getAllPayments,
  getExpiringSoonUsers,
} from "../../services/payment-service";

export async function getAllPaymentsHandler(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const statusRaw = req.query.status as string | undefined;
  const status =
    statusRaw === "pending" || statusRaw === "completed" || statusRaw === "failed"
      ? statusRaw
      : undefined;

  const result = await getAllPayments({ page, pageSize, ...(status ? { status } : {}) });
  res.status(HTTP_STATUS.OK).json(result);
}

export async function checkExpiredPremiumHandler(_req: Request, res: Response): Promise<void> {
  const packageTypeRaw = _req.query.packageType as string | undefined;
  const packageType =
    packageTypeRaw === "pre" || packageTypeRaw === "max" || packageTypeRaw === "all"
      ? packageTypeRaw
      : "all";

  const result = await checkExpiredPremium(packageType);
  res.status(HTTP_STATUS.OK).json(result);
}

export async function getExpiringSoonUsersHandler(req: Request, res: Response): Promise<void> {
  const days = Number(req.query.days ?? 7);
  const packageTypeRaw = req.query.packageType as string | undefined;
  const packageType =
    packageTypeRaw === "pre" || packageTypeRaw === "max" || packageTypeRaw === "all"
      ? packageTypeRaw
      : "all";

  const result = await getExpiringSoonUsers(days, packageType);
  res.status(HTTP_STATUS.OK).json(result);
}
