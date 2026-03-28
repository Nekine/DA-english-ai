import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import {
  addManualPayment,
  checkEmail,
  checkExpiredPremium,
  getAllPayments,
  getExpiringSoonUsers,
} from "../../services/payment-service";

export async function checkEmailHandler(req: Request, res: Response): Promise<void> {
  const email = String(req.query.email ?? "").trim();
  if (!email) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "email is required" });
    return;
  }

  const result = await checkEmail(email);
  res.status(HTTP_STATUS.OK).json(result);
}

export async function addManualPaymentHandler(req: Request, res: Response): Promise<void> {
  const result = await addManualPayment(req.body);
  res.status(result.statusCode).json(result.body);
}

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
  const result = await checkExpiredPremium();
  res.status(HTTP_STATUS.OK).json(result);
}

export async function getExpiringSoonUsersHandler(req: Request, res: Response): Promise<void> {
  const days = Number(req.query.days ?? 7);
  const result = await getExpiringSoonUsers(days);
  res.status(HTTP_STATUS.OK).json(result);
}
