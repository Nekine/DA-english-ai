import { Router } from "express";
import {
  createWritingExerciseHandler,
  deleteWritingExerciseHandler,
  getWritingExerciseByIdHandler,
  getWritingExercisesHandler,
  updateWritingExerciseHandler,
} from "../controllers/writing-exercise/writing-exercise-controller";
import { asyncHandler } from "../utils/async-handler";

export const writingExerciseRoutes = Router();

writingExerciseRoutes.get("/", asyncHandler(getWritingExercisesHandler));
writingExerciseRoutes.get("/:id", asyncHandler(getWritingExerciseByIdHandler));
writingExerciseRoutes.post("/", asyncHandler(createWritingExerciseHandler));
writingExerciseRoutes.put("/:id", asyncHandler(updateWritingExerciseHandler));
writingExerciseRoutes.delete("/:id", asyncHandler(deleteWritingExerciseHandler));
