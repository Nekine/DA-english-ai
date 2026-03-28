import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import { AppError } from "../../errors/app-error";
import { ERROR_CODES } from "../../errors/error-codes";
import { getUserById, getUsers } from "../../services/users-service";

function toPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export async function getUsersHandler(req: Request, res: Response): Promise<void> {
  const page = toPositiveInt(req.query.page as string | undefined, 1);
  const pageSize = toPositiveInt(req.query.pageSize as string | undefined, 10);

  const accountType = req.query.accountType as "free" | "premium" | undefined;
  const search = req.query.search as string | undefined;
  const status = req.query.status as "active" | "inactive" | "banned" | undefined;

  const input = {
    page,
    pageSize,
    ...(accountType ? { accountType } : {}),
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
  };

  const result = await getUsers(input);

  res.status(HTTP_STATUS.OK).json(result);
}

export async function getUserByIdHandler(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError("Invalid user id", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new AppError("User not found", HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  res.status(HTTP_STATUS.OK).json(user);
}
