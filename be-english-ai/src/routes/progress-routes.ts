import { Router } from "express";
import {
  getProgressActivitiesHandler,
  getProgressStatsHandler,
  getWeeklyProgressHandler,
} from "../controllers/progress/progress-controller";

export const progressRoutes = Router();

progressRoutes.get("/stats/:userId", getProgressStatsHandler);
progressRoutes.get("/activities/:userId", getProgressActivitiesHandler);
progressRoutes.get("/weekly/:userId", getWeeklyProgressHandler);
