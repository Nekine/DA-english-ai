import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import { AppError } from "../../errors/app-error";
import { ERROR_CODES } from "../../errors/error-codes";
import {
  getUserById,
  login,
  oauthLogin,
  register,
  type OAuthLoginRequest,
  type RegisterRequest,
} from "../../services/auth/auth-service";

export async function registerHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as RegisterRequest;

  const result = await register(body);
  res.status(result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST).json(result);
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    emailOrUsername: string;
    password: string;
    rememberMe?: boolean;
  };

  const result = await login({
    emailOrUsername: body.emailOrUsername,
    password: body.password,
    rememberMe: body.rememberMe ?? false,
  });

  res.status(result.success ? HTTP_STATUS.OK : HTTP_STATUS.UNAUTHORIZED).json(result);
}

export async function oauthLoginHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as OAuthLoginRequest;

  const result = await oauthLogin(body);
  res.status(result.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST).json(result);
}

export async function currentUserHandler(req: Request, res: Response): Promise<void> {
  const userId = Number(req.auth?.sub ?? 0);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError("Invalid or missing token", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.AUTH_REQUIRED);
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new AppError("User not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  res.status(HTTP_STATUS.OK).json({ success: true, user });
}

export function healthHandler(_req: Request, res: Response): void {
  res.status(HTTP_STATUS.OK).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
}
