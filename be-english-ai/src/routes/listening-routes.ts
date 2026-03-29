import { Router } from "express";
import {
  generateListeningHandler,
  getListeningGenresHandler,
  getRecentListeningHandler,
  gradeListeningHandler,
} from "../controllers/listening/listening-controller";
import { asyncHandler } from "../utils/async-handler";

export const listeningRoutes = Router();

listeningRoutes.get("/Genres", asyncHandler(getListeningGenresHandler));
listeningRoutes.post("/Generate", asyncHandler(generateListeningHandler));
listeningRoutes.post("/Grade", asyncHandler(gradeListeningHandler));
listeningRoutes.get("/Recent", asyncHandler(getRecentListeningHandler));
