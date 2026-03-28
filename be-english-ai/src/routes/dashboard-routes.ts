import { Router } from "express";
import { getDashboardCompatibilityHandler } from "../controllers/dashboard/dashboard-controller";

export const dashboardRoutes = Router();

dashboardRoutes.get("/", getDashboardCompatibilityHandler);
