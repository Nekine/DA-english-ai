import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import {
  addDictionaryFavorite,
  getDictionaryFavorites,
  getDictionaryHistory,
  removeDictionaryFavorite,
  searchDictionary,
} from "../../services/dictionary-service";

export async function searchDictionaryHandler(req: Request, res: Response): Promise<void> {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const keyword = String(req.query.keyword ?? "");
  const context = typeof req.query.context === "string" ? req.query.context : undefined;
  const provider = typeof req.query.provider === "string" ? req.query.provider : undefined;

  const result = await searchDictionary({
    keyword,
    ...(context ? { context } : {}),
    ...(provider ? { provider } : {}),
  });
  if (result.error) {
    res.status(result.status || HTTP_STATUS.BAD_REQUEST).json({ message: result.error });
    return;
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result.data,
  });
}

export function getDictionaryHistoryHandler(_req: Request, res: Response): void {
  res.status(HTTP_STATUS.OK).json({ success: true, data: getDictionaryHistory() });
}

export function addDictionaryFavoriteHandler(req: Request, res: Response): void {
  const body = req.body as { word?: string };
  const result = addDictionaryFavorite(String(body.word ?? ""));

  if (result.error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: result.error });
    return;
  }

  res.status(HTTP_STATUS.OK).json({ success: true, data: result.data });
}

export function getDictionaryFavoritesHandler(_req: Request, res: Response): void {
  res.status(HTTP_STATUS.OK).json({ success: true, data: getDictionaryFavorites() });
}

export function removeDictionaryFavoriteHandler(req: Request, res: Response): void {
  const word = String(req.params.word ?? "");
  const result = removeDictionaryFavorite(word);
  res.status(HTTP_STATUS.OK).json({ success: true, data: result });
}
