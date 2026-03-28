import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../constants/http-status";
import { AppError } from "../../errors/app-error";
import { ERROR_CODES } from "../../errors/error-codes";
import {
  createUserManagementUser,
  deleteUserManagementUser,
  exportUsersToExcel,
  getUserManagementUserDetail,
  getUserManagementUsers,
  importUsersFromExcel,
  updateUserManagementUser,
} from "../../services/user-management-service";
import type {
  UserManagementCreateUserDto,
  UserManagementUpdateUserDto,
} from "../../schemas/user-management-schemas";

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

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

export async function getUserManagementUsersHandler(req: Request, res: Response): Promise<void> {
  const input = {
    ...((req.query.search as string | undefined) ? { search: req.query.search as string } : {}),
    ...((req.query.status as string | undefined) ? { status: req.query.status as string } : {}),
    ...((req.query.level as string | undefined) ? { level: req.query.level as string } : {}),
    ...((req.query.orderBy as string | undefined) ? { orderBy: req.query.orderBy as string } : {}),
    orderDesc: toBoolean(req.query.orderDesc as string | undefined, true),
    page: toPositiveInt(req.query.page as string | undefined, 1),
    pageSize: toPositiveInt(req.query.pageSize as string | undefined, 20),
  };

  const result = await getUserManagementUsers(input);

  res.status(HTTP_STATUS.OK).json(result);
}

export async function getUserManagementUserDetailHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError("Invalid user id", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await getUserManagementUserDetail(userId);
  if (!result) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: "User not found" });
    return;
  }

  res.status(HTTP_STATUS.OK).json(result);
}

export async function createUserManagementUserHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as UserManagementCreateUserDto;
  const username = (body.userName ?? body.username ?? "").trim();
  if (!username) {
    throw new AppError("Invalid input data", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  const status = body.isActive !== undefined ? (body.isActive ? "Active" : "Inactive") : body.status;

  const result = await createUserManagementUser({
    username,
    email: body.email,
    fullName: body.fullName,
    preferredLevel: body.preferredLevel ?? body.level,
    status,
    totalXP: body.totalXP,
  });

  res.status(result.statusCode).json(result.body);
}

export async function updateUserManagementUserHandler(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError("Invalid user id", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  const body = req.body as UserManagementUpdateUserDto;
  const username = (body.userName ?? body.username ?? "").trim();
  if (!username) {
    throw new AppError("Invalid input data", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  const status = body.isActive !== undefined ? (body.isActive ? "Active" : "Inactive") : body.status;

  const result = await updateUserManagementUser(userId, {
    username,
    email: body.email,
    fullName: body.fullName,
    preferredLevel: body.preferredLevel ?? body.level,
    status,
    totalXP: body.totalXP,
  });

  res.status(result.statusCode).json(result.body);
}

export async function deleteUserManagementUserHandler(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError("Invalid user id", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await deleteUserManagementUser(userId);
  if (result.statusCode === HTTP_STATUS.NO_CONTENT) {
    res.status(HTTP_STATUS.NO_CONTENT).send();
    return;
  }

  res.status(result.statusCode).json(result.body);
}

export async function importUsersFromExcelHandler(req: Request, res: Response): Promise<void> {
  if (!req.file || !req.file.buffer) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "No file uploaded" });
    return;
  }

  const fileName = req.file.originalname?.toLowerCase() ?? "";
  if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: "Invalid file format. Please upload Excel file.",
    });
    return;
  }

  const result = await importUsersFromExcel(req.file.buffer);
  res.status(HTTP_STATUS.OK).json(result);
}

export async function exportUsersToExcelHandler(_req: Request, res: Response): Promise<void> {
  const { fileBuffer, fileName } = await exportUsersToExcel();

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
  res.status(HTTP_STATUS.OK).send(fileBuffer);
}
