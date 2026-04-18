import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import {
  createPayosPayment,
  getPayosOrderStatusForUser,
  handlePayosWebhook,
  type PaymentPlanCycle,
  type PaymentPlanTier,
} from "../../services/payos-payment-service";

function parseTier(value: unknown): PaymentPlanTier | null {
  return value === "pre" || value === "max" ? value : null;
}

function parseCycle(value: unknown): PaymentPlanCycle | null {
  return value === "1month" || value === "6months" || value === "1year" ? value : null;
}

export async function createPayosPaymentLinkHandler(req: Request, res: Response): Promise<void> {
  const accountId = Number(req.auth?.sub ?? 0);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: "Unauthorized" });
    return;
  }

  const tier = parseTier(req.body?.tier);
  const cycle = parseCycle(req.body?.cycle);
  const buyerName = String(req.body?.fullName ?? "").trim();
  const buyerEmail = String(req.body?.email ?? req.auth?.email ?? "").trim();
  const buyerPhone = String(req.body?.phone ?? "").trim();

  if (!tier || !cycle || !buyerName || !buyerEmail || !buyerPhone) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: "tier, cycle, fullName, email, phone are required",
    });
    return;
  }

  const result = await createPayosPayment({
    accountId,
    tier,
    cycle,
    buyerName,
    buyerEmail,
    buyerPhone,
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
}

export async function getMyPayosOrderStatusHandler(req: Request, res: Response): Promise<void> {
  const accountId = Number(req.auth?.sub ?? 0);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: "Unauthorized" });
    return;
  }

  const orderCode = String(req.params.orderCode ?? "").trim();
  if (!orderCode) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "orderCode is required" });
    return;
  }

  const result = await getPayosOrderStatusForUser(orderCode, accountId);
  if (!result) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Payment order not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
}

export async function payosWebhookHandler(req: Request, res: Response): Promise<void> {
  const result = await handlePayosWebhook(req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: result ? "Webhook processed" : "Webhook ignored (order not found)",
    ...(result ? { payment: result } : {}),
  });
}
