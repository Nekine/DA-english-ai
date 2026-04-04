import { Router } from "express";
import {
  createTestExamHandler,
  getTestExamDetailHandler,
  getTestExamListHandler,
  getTestExamSuggestedTopicsHandler,
} from "../controllers/test-exam/test-exam-controller";
import { asyncHandler } from "../utils/async-handler";

export const testExamRoutes = Router();

testExamRoutes.get("/list", asyncHandler(getTestExamListHandler));
testExamRoutes.get("/suggested-topics", asyncHandler(getTestExamSuggestedTopicsHandler));
testExamRoutes.post("/create", asyncHandler(createTestExamHandler));
testExamRoutes.get("/:testId", asyncHandler(getTestExamDetailHandler));
