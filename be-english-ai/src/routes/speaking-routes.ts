import { Router } from "express";
import {
  analyzeSpeakingHandler,
  generateSpeakingHandler,
  getSpeakingEnglishLevelsHandler,
  getSpeakingTopicsHandler,
} from "../controllers/speaking/speaking-controller";
import { asyncHandler } from "../utils/async-handler";

export const speakingRoutes = Router();

speakingRoutes.get("/Topics", asyncHandler(getSpeakingTopicsHandler));
speakingRoutes.get("/EnglishLevels", asyncHandler(getSpeakingEnglishLevelsHandler));
speakingRoutes.post("/Generate", asyncHandler(generateSpeakingHandler));
speakingRoutes.post("/Analyze", asyncHandler(analyzeSpeakingHandler));
