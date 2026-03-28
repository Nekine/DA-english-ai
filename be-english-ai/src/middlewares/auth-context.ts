import type { NextFunction, Request, Response } from "express";
import { parseBearerToken, verifyAccessToken } from "../services/auth/jwt-service";

export function authContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.auth = null;

  const authHeader = req.header("Authorization");
  if (!authHeader) {
    next();
    return;
  }

  try {
    const token = parseBearerToken(authHeader);
    req.auth = verifyAccessToken(token);
  } catch {
    // Keep parity with legacy JwtMiddleware: invalid token does not hard-fail here.
    req.auth = null;
  }

  next();
}
