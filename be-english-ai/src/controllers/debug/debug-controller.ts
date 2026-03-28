import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import { AuthRepository } from "../../database/repositories/auth-repository";
import { hashPassword } from "../../services/auth/password-service";

const authRepository = new AuthRepository();

export async function checkUserHandler(req: Request, res: Response): Promise<void> {
  const emailOrUsername = String(req.params.emailOrUsername ?? "").trim();
  if (!emailOrUsername) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "emailOrUsername is required" });
    return;
  }

  const user = await authRepository.findByEmailOrUsername(emailOrUsername.toLowerCase());
  if (!user) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "User not found" });
    return;
  }

  const passwordHash = user.passwordHash || "";
  res.status(HTTP_STATUS.OK).json({
    userId: user.id,
    username: user.username,
    email: user.email,
    hasPasswordHash: passwordHash.length > 0,
    passwordHashLength: passwordHash.length,
    passwordHashPreview: passwordHash.length > 10 ? `${passwordHash.slice(0, 10)}...` : passwordHash,
    isOAuthUser: passwordHash.length === 0,
    status: user.status,
  });
}

export async function generateHashHandler(req: Request, res: Response): Promise<void> {
  const raw = req.body as string | { password?: string };
  const password = typeof raw === "string" ? raw : String(raw?.password ?? "");

  if (!password) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "password is required" });
    return;
  }

  const hash = await hashPassword(password);

  res.status(HTTP_STATUS.OK).json({
    password,
    hash,
    hashLength: hash.length,
    sqlCommand: `UPDATE users SET password_hash = '${hash}' WHERE username = 'your_username';`,
  });
}
