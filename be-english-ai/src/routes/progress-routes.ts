import { Router } from "express";
import {
  getProgressAttendanceHandler,
  getProgressOverviewHandler,
  getProgressActivitiesHandler,
  getProgressStatsHandler,
  getWeeklyProgressHandler,
} from "../controllers/progress/progress-controller";
import { requireAuth } from "../middlewares/require-auth";

export const progressRoutes = Router();

progressRoutes.use(requireAuth);

progressRoutes.get("/overview", getProgressOverviewHandler);
progressRoutes.get("/attendance", getProgressAttendanceHandler);

progressRoutes.get("/stats/:userId", getProgressStatsHandler);
progressRoutes.get("/activities/:userId", getProgressActivitiesHandler);
progressRoutes.get("/weekly/:userId", getWeeklyProgressHandler);
