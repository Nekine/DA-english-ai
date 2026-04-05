import { Router } from "express";
import {
	saveExerciseHandler,
	saveSentenceWritingHandler,
	submitExerciseResultHandler,
	submitSentenceWritingResultHandler,
} from "../controllers/exercise/exercise-controller";
import { requireAuth } from "../middlewares/require-auth";

export const exerciseRoutes = Router();

exerciseRoutes.use(requireAuth);

exerciseRoutes.post("/save", saveExerciseHandler);
exerciseRoutes.post("/save-sentence-writing", saveSentenceWritingHandler);
exerciseRoutes.post("/submit-result", submitExerciseResultHandler);
exerciseRoutes.post("/submit-sentence-writing-result", submitSentenceWritingResultHandler);
