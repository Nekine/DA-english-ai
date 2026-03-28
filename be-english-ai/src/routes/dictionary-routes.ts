import { Router } from "express";
import {
  addDictionaryFavoriteHandler,
  getDictionaryFavoritesHandler,
  getDictionaryHistoryHandler,
  removeDictionaryFavoriteHandler,
  searchDictionaryHandler,
} from "../controllers/dictionary/dictionary-controller";
import { asyncHandler } from "../utils/async-handler";

export const dictionaryRoutes = Router();

dictionaryRoutes.get("/Search", asyncHandler(searchDictionaryHandler));
dictionaryRoutes.get("/History", getDictionaryHistoryHandler);
dictionaryRoutes.post("/Favorites", addDictionaryFavoriteHandler);
dictionaryRoutes.get("/Favorites", getDictionaryFavoritesHandler);
dictionaryRoutes.delete("/Favorites/:word", removeDictionaryFavoriteHandler);
