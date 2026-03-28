import { Router } from "express";
import {
  getMyTeacherReviewsHandler,
  getTeacherReviewDetailHandler,
} from "../controllers/teacher-review/teacher-review-controller";

export const teacherReviewRoutes = Router();

teacherReviewRoutes.get("/my-reviews", getMyTeacherReviewsHandler);
teacherReviewRoutes.get("/detail/:completionId", getTeacherReviewDetailHandler);
