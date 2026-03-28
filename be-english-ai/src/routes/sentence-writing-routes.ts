import { Router } from "express";
import { generateSentenceWritingHandler } from "../controllers/sentence-writing/sentence-writing-controller";
import { asyncHandler } from "../utils/async-handler";

export const sentenceWritingRoutes = Router();

sentenceWritingRoutes.post("/Generate", asyncHandler(generateSentenceWritingHandler));
