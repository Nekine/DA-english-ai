import { Router } from "express";
import {
  generateListeningHandler,
  getListeningGenresHandler,
  getRecentListeningHandler,
  gradeListeningHandler,
} from "../controllers/listening/listening-controller";
import { asyncHandler } from "../utils/async-handler";

export const listeningRoutes = Router();

listeningRoutes.get("/Genres", getListeningGenresHandler);
listeningRoutes.post("/Generate", generateListeningHandler);
listeningRoutes.post("/Grade", gradeListeningHandler);
listeningRoutes.get("/Recent", getRecentListeningHandler);
