import { Router } from "express";
import {
  getUserProgressCompatibilityHandler,
  getUserStatsCompatibilityHandler,
} from "../controllers/progress/progress-controller";
import { requireAuth } from "../middlewares/require-auth";

export const userProgressRoutes = Router();

userProgressRoutes.use(requireAuth);

userProgressRoutes.get("/:userId/stats", getUserStatsCompatibilityHandler);
userProgressRoutes.get("/:userId/progress", getUserProgressCompatibilityHandler);
