import { Router } from "express";
import {
  getRevenuePaymentHandler,
  getSystemStatisticsHandler,
  getUserGrowthHandler,
  getUsersByRoleHandler,
} from "../controllers/statistics/statistics-controller";
import { asyncHandler } from "../utils/async-handler";

export const statisticsRoutes = Router();

statisticsRoutes.get("/", asyncHandler(getSystemStatisticsHandler));
statisticsRoutes.get("/users-by-role", asyncHandler(getUsersByRoleHandler));
statisticsRoutes.get("/user-growth", asyncHandler(getUserGrowthHandler));
statisticsRoutes.get("/revenue-payment", asyncHandler(getRevenuePaymentHandler));
