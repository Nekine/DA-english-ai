import type { NextFunction, Request, Response } from "express";
import { HTTP_STATUS } from "../constants/http-status";
import { AppError } from "../errors/app-error";
import { ERROR_CODES } from "../errors/error-codes";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth?.sub) {
    next(new AppError("Invalid or missing token", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.AUTH_REQUIRED));
    return;
  }

  next();
}
