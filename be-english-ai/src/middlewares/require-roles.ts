import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../constants/domain-values";
import { HTTP_STATUS } from "../constants/http-status";
import { AppError } from "../errors/app-error";
import { ERROR_CODES } from "../errors/error-codes";
import { assertRoles } from "../services/auth/authorization";

export function requireRoles(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const role = req.auth?.role;

    if (!role) {
      next(new AppError("Access denied", HTTP_STATUS.FORBIDDEN, ERROR_CODES.ACCESS_DENIED));
      return;
    }

    try {
      assertRoles(role, allowedRoles);
      next();
    } catch (error) {
      next(error);
    }
  };
}
