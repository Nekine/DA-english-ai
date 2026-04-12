import { Router } from "express";
import {
  getLearningProfileHandler,
  refreshLearningProfileHandler,
} from "../controllers/learning-insights/learning-insights-controller";
import { requireAuth } from "../middlewares/require-auth";
import { asyncHandler } from "../utils/async-handler";

export const learningInsightsRoutes = Router();

learningInsightsRoutes.use(requireAuth);

learningInsightsRoutes.get("/profile", asyncHandler(getLearningProfileHandler));
learningInsightsRoutes.post("/refresh", asyncHandler(refreshLearningProfileHandler));
