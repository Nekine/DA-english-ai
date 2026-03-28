import type { NextFunction, Request, Response } from "express";
import type { z, ZodType } from "zod";
import { HTTP_STATUS } from "../constants/http-status";
import { AppError } from "../errors/app-error";
import { ERROR_CODES } from "../errors/error-codes";

export function validateBody<TSchema extends ZodType>(schema: TSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const issuePath = firstIssue?.path.join(".") || "body";
      const message = firstIssue?.message ?? "Invalid input data";

      next(
        new AppError(
          `Invalid input data: ${issuePath} - ${message}`,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR,
          parsed.error.flatten(),
        ),
      );
      return;
    }

    req.body = parsed.data as z.infer<TSchema>;
    next();
  };
}
