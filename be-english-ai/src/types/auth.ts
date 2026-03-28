import type { AccountType, UserRole, UserStatus } from "../constants/domain-values";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthUserSummary {
  userId: number;
  email: string;
  username: string | null;
  fullName: string | null;
  avatar: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  accountType: AccountType;
  premiumExpiresAt: string | null;
}
