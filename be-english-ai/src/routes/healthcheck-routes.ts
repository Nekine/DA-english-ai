import { Router } from "express";
import {
  extractTextFromImageHandler,
  getLatestGithubCommitHandler,
  healthcheckHandler,
  sendFeedbackHandler,
} from "../controllers/healthcheck/healthcheck-controller";

export const healthcheckRoutes = Router();

healthcheckRoutes.get("/", healthcheckHandler);
healthcheckRoutes.post("/SendFeedback", sendFeedbackHandler);
healthcheckRoutes.post("/ExtractTextFromImage", extractTextFromImageHandler);
healthcheckRoutes.get("/GetLatestGithubCommit", getLatestGithubCommitHandler);
