import { Router } from "express";
import {
  generateListeningHandler,
  getListeningByIdHandler,
  getListeningGenresHandler,
  getRecentListeningHandler,
  gradeListeningHandler,
} from "../controllers/listening/listening-controller";
import { requireAuth } from "../middlewares/require-auth";
import { asyncHandler } from "../utils/async-handler";

export const listeningRoutes = Router();

listeningRoutes.use(requireAuth);

listeningRoutes.get("/Genres", asyncHandler(getListeningGenresHandler));
listeningRoutes.post("/Generate", asyncHandler(generateListeningHandler));
listeningRoutes.post("/Grade", asyncHandler(gradeListeningHandler));
listeningRoutes.get("/Recent", asyncHandler(getRecentListeningHandler));
listeningRoutes.get("/:id", asyncHandler(getListeningByIdHandler));
