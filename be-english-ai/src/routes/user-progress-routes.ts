import { Router } from "express";
import {
  getUserProgressCompatibilityHandler,
  getUserStatsCompatibilityHandler,
} from "../controllers/progress/progress-controller";

export const userProgressRoutes = Router();

userProgressRoutes.get("/:userId/stats", getUserStatsCompatibilityHandler);
userProgressRoutes.get("/:userId/progress", getUserProgressCompatibilityHandler);
