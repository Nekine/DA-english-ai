import { Router } from "express";
import { saveExerciseHandler, saveSentenceWritingHandler } from "../controllers/exercise/exercise-controller";

export const exerciseRoutes = Router();

exerciseRoutes.post("/save", saveExerciseHandler);
exerciseRoutes.post("/save-sentence-writing", saveSentenceWritingHandler);
