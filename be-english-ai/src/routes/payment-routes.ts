import { Router } from "express";
import {
  checkExpiredPremiumHandler,
  getAllPaymentsHandler,
  getExpiringSoonUsersHandler,
} from "../controllers/payment/payment-controller";
import {
  createPayosPaymentLinkHandler,
  getMyPayosOrderStatusHandler,
  payosWebhookHandler,
} from "../controllers/payment/payos-payment-controller";
import { requireAuth } from "../middlewares/require-auth";
import { asyncHandler } from "../utils/async-handler";

export const paymentRoutes = Router();

paymentRoutes.get("/all", asyncHandler(getAllPaymentsHandler));
paymentRoutes.post("/check-expired-premium", asyncHandler(checkExpiredPremiumHandler));
paymentRoutes.get("/expiring-soon", asyncHandler(getExpiringSoonUsersHandler));

paymentRoutes.post("/payos/create-link", requireAuth, asyncHandler(createPayosPaymentLinkHandler));
paymentRoutes.get("/payos/order/:orderCode", requireAuth, asyncHandler(getMyPayosOrderStatusHandler));
paymentRoutes.post("/payos/webhook", asyncHandler(payosWebhookHandler));
