import { Router } from "express";
import {
  generateAssignmentHandler,
  getAssignmentEnglishLevelsHandler,
  getAssignmentTypesHandler,
  suggestAssignmentTopicsHandler,
} from "../controllers/assignment/assignment-controller";
import { asyncHandler } from "../utils/async-handler";

export const assignmentRoutes = Router();

assignmentRoutes.post("/Generate", asyncHandler(generateAssignmentHandler));
assignmentRoutes.get("/GetEnglishLevels", getAssignmentEnglishLevelsHandler);
assignmentRoutes.get("/GetAssignmentTypes", getAssignmentTypesHandler);
assignmentRoutes.get("/SuggestTopics", asyncHandler(suggestAssignmentTopicsHandler));
