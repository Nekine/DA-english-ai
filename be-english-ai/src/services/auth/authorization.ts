import { USER_ROLE, USER_STATUS, type UserRole, type UserStatus } from "../../constants/domain-values";
import { HTTP_STATUS } from "../../constants/http-status";
import { AppError } from "../../errors/app-error";
import { ERROR_CODES } from "../../errors/error-codes";
import type { AuthTokenPayload, AuthUserSummary } from "../../types/auth";

export function assertAuthenticated(payload: AuthTokenPayload | null): AuthTokenPayload {
  if (!payload) {
    throw new AppError("Authentication required", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.AUTH_REQUIRED);
  }

  return payload;
}

export function assertRoles(role: UserRole, allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(role)) {
    throw new AppError("Access denied", HTTP_STATUS.FORBIDDEN, ERROR_CODES.ACCESS_DENIED);
  }
}

export function assertActiveStatus(status: UserStatus): void {
  if (status !== USER_STATUS.ACTIVE) {
    throw new AppError("User account is not active", HTTP_STATUS.FORBIDDEN, ERROR_CODES.ACCESS_DENIED);
  }
}

export function isAdminRole(role: UserRole): boolean {
  return role === USER_ROLE.ADMIN;
}

export function toAuthUserSummary(input: {
  userId: number;
  email: string;
  username?: string | null;
  fullName?: string | null;
  avatar?: string | null;
  role: UserRole;
  status: UserStatus;
  accountType: AuthUserSummary["accountType"];
  premiumExpiresAt?: string | null;
}): AuthUserSummary {
  return {
    userId: input.userId,
    email: input.email,
    username: input.username ?? null,
    fullName: input.fullName ?? null,
    avatar: input.avatar ?? null,
    role: input.role,
    status: input.status,
    emailVerified: true,
    accountType: input.accountType,
    premiumExpiresAt: input.premiumExpiresAt ?? null,
  };
}
