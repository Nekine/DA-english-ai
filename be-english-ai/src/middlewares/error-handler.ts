import type { NextFunction, Request, Response } from "express";
import { HTTP_STATUS } from "../constants/http-status";
import { AppError, isAppError } from "../errors/app-error";
import { ERROR_CODES } from "../errors/error-codes";
import { logger } from "../utils/logger";

function previewValue(value: unknown): unknown {
  if (value == null) {
    return value;
  }

  try {
    const asText = JSON.stringify(value);
    if (!asText) {
      return value;
    }

    return asText.length > 1000 ? `${asText.slice(0, 1000)}...<truncated>` : value;
  } catch {
    return "<unserializable>";
  }
}

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(
    new AppError(
      `Route not found: ${req.method} ${req.originalUrl}`,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.RESOURCE_NOT_FOUND,
    ),
  );
}

export function errorHandlerMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const normalized = isAppError(error)
    ? error
    : new AppError(
        "Internal server error",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        error,
      );

  const errorLike = error instanceof Error ? error : null;
  const logContext = {
    method: req.method,
    url: req.originalUrl,
    statusCode: normalized.statusCode,
    code: normalized.code,
    message: normalized.message,
    details: previewValue(normalized.details),
    query: previewValue(req.query),
    params: previewValue(req.params),
    body: previewValue(req.body),
    stack: errorLike?.stack,
  };

  if (normalized.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    logger.error("Unhandled application error", logContext);
  } else {
    logger.warn("Handled application error", logContext);
  }

  res.status(normalized.statusCode).json({
    success: false,
    message: normalized.message,
    code: normalized.code,
  });
}
