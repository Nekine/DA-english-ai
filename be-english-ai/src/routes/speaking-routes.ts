import { Router } from "express";
import {
  analyzeSpeakingHandler,
  generateSpeakingHandler,
  getSpeakingEnglishLevelsHandler,
  getSpeakingTopicsHandler,
} from "../controllers/speaking/speaking-controller";

export const speakingRoutes = Router();

speakingRoutes.get("/Topics", getSpeakingTopicsHandler);
speakingRoutes.get("/EnglishLevels", getSpeakingEnglishLevelsHandler);
speakingRoutes.post("/Generate", generateSpeakingHandler);
speakingRoutes.post("/Analyze", analyzeSpeakingHandler);
