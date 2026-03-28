import { Router } from "express";
import {
  getAiReviewStatsHandler,
  getAiReviewSubmissionDetailsHandler,
  getAiReviewSubmissionsHandler,
  updateAiReviewSubmissionHandler,
} from "../controllers/ai-review/ai-review-controller";

export const aiReviewRoutes = Router();

aiReviewRoutes.get("/stats", getAiReviewStatsHandler);
aiReviewRoutes.get("/submissions", getAiReviewSubmissionsHandler);
aiReviewRoutes.get("/submissions/:id/details", getAiReviewSubmissionDetailsHandler);
aiReviewRoutes.put("/submissions/:id/review", updateAiReviewSubmissionHandler);
