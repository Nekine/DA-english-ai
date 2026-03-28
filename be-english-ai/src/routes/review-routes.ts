import { Router } from "express";
import { generateReviewHandler, saveWritingExerciseHandler } from "../controllers/review/review-controller";
import { asyncHandler } from "../utils/async-handler";

export const reviewRoutes = Router();

reviewRoutes.post("/Generate", asyncHandler(generateReviewHandler));
reviewRoutes.post("/SaveWritingExercise", asyncHandler(saveWritingExerciseHandler));
