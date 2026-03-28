import { Router } from "express";
import {
  getLeaderboardHandler,
  getLeaderboardUserRankHandler,
  searchLeaderboardHandler,
} from "../controllers/leaderboard/leaderboard-controller";

export const leaderboardRoutes = Router();

leaderboardRoutes.get("/", getLeaderboardHandler);
leaderboardRoutes.get("/search", searchLeaderboardHandler);
leaderboardRoutes.get("/user/:userId/rank", getLeaderboardUserRankHandler);
