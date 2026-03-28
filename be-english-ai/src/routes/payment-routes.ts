import { Router } from "express";
import {
  addManualPaymentHandler,
  checkEmailHandler,
  checkExpiredPremiumHandler,
  getAllPaymentsHandler,
  getExpiringSoonUsersHandler,
} from "../controllers/payment/payment-controller";
import { asyncHandler } from "../utils/async-handler";

export const paymentRoutes = Router();

paymentRoutes.get("/check-email", asyncHandler(checkEmailHandler));
paymentRoutes.post("/manual-payment", asyncHandler(addManualPaymentHandler));
paymentRoutes.get("/all", asyncHandler(getAllPaymentsHandler));
paymentRoutes.post("/check-expired-premium", asyncHandler(checkExpiredPremiumHandler));
paymentRoutes.get("/expiring-soon", asyncHandler(getExpiringSoonUsersHandler));
