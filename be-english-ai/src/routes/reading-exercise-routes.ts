import { Router } from "express";
import {
  addReadingQuestionsHandler,
  createReadingPassageHandler,
  createReadingWithAiHandler,
  deleteReadingExerciseHandler,
  generateAiReadingHandler,
  getReadingExerciseByIdHandler,
  listReadingExercisesHandler,
  submitReadingResultHandler,
  updateReadingExerciseHandler,
} from "../controllers/reading-exercise/reading-exercise-controller";
import { requireAuth } from "../middlewares/require-auth";
import { asyncHandler } from "../utils/async-handler";

export const readingExerciseRoutes = Router();

readingExerciseRoutes.use(requireAuth);

readingExerciseRoutes.get("/", asyncHandler(listReadingExercisesHandler));
readingExerciseRoutes.get("/:id", asyncHandler(getReadingExerciseByIdHandler));
readingExerciseRoutes.post("/create-passage", asyncHandler(createReadingPassageHandler));
readingExerciseRoutes.post("/:id/add-questions", asyncHandler(addReadingQuestionsHandler));
readingExerciseRoutes.post("/create-with-ai", asyncHandler(createReadingWithAiHandler));
readingExerciseRoutes.post("/generate-ai", asyncHandler(generateAiReadingHandler));
readingExerciseRoutes.post("/submit-result", asyncHandler(submitReadingResultHandler));
readingExerciseRoutes.put("/:id", asyncHandler(updateReadingExerciseHandler));
readingExerciseRoutes.delete("/:id", asyncHandler(deleteReadingExerciseHandler));
