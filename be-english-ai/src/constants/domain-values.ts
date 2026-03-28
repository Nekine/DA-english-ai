export const USER_STATUSES = ["active", "inactive", "banned"] as const;
export const ACCOUNT_TYPES = ["free", "premium"] as const;
export const USER_ROLES = ["user", "admin", "customer"] as const;

export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  BANNED: "banned",
} as const;

export const ACCOUNT_TYPE = {
  FREE: "free",
  PREMIUM: "premium",
} as const;

export const USER_ROLE = {
  USER: "user",
  ADMIN: "admin",
  CUSTOMER: "customer",
} as const;

export const REVIEW_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "needs_regrade",
] as const;

export const PAYMENT_STATUSES = ["pending", "completed", "failed"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type UserRole = (typeof USER_ROLES)[number];
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
