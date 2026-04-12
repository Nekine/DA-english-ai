import { Router } from "express";
import {
  createTestExamHandler,
  getTestExamDetailHandler,
  getTestExamListHandler,
  getTestExamSuggestedTopicsHandler,
  submitTestExamHandler,
} from "../controllers/test-exam/test-exam-controller";
import { requireAuth } from "../middlewares/require-auth";
import { asyncHandler } from "../utils/async-handler";

export const testExamRoutes = Router();

testExamRoutes.use(requireAuth);

testExamRoutes.get("/list", asyncHandler(getTestExamListHandler));
testExamRoutes.get("/suggested-topics", asyncHandler(getTestExamSuggestedTopicsHandler));
testExamRoutes.post("/create", asyncHandler(createTestExamHandler));
testExamRoutes.post("/:testId/submit", asyncHandler(submitTestExamHandler));
testExamRoutes.get("/:testId", asyncHandler(getTestExamDetailHandler));
