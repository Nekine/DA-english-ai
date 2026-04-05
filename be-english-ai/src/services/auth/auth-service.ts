import { ACCOUNT_TYPE, USER_ROLE, USER_STATUS } from "../../constants/domain-values";
import { AuthRepository } from "../../database/repositories/auth-repository";
import type { AuthUserSummary } from "../../types/auth";
import { buildJwtPayload, signAccessToken } from "./jwt-service";
import { hashPassword, verifyPassword } from "./password-service";
import { toAuthUserSummary } from "./authorization";

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  fullName?: string | null;
  currentLevel?: "unknown" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
  rememberMe?: boolean;
}

export interface OAuthLoginRequest {
  provider: "google" | "facebook";
  providerId: string;
  email: string;
  fullName?: string | null;
  avatar?: string | null;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: AuthUserSummary;
}

const authRepository = new AuthRepository();

function toAuthResponseUser(input: {
  userId: number;
  email: string;
  username: string | null;
  fullName: string | null;
  avatar: string | null;
  currentLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
  role: "user" | "admin" | "customer";
  status: "active" | "inactive" | "banned";
  accountType: "free" | "premium";
  premiumExpiresAt: Date | string | null;
}): AuthUserSummary {
  return toAuthUserSummary({
    userId: input.userId,
    email: input.email,
    username: input.username,
    fullName: input.fullName,
    avatar: input.avatar,
    currentLevel: input.currentLevel,
    role: input.role,
    status: input.status,
    accountType: input.accountType,
    premiumExpiresAt:
      input.premiumExpiresAt instanceof Date
        ? input.premiumExpiresAt.toISOString()
        : input.premiumExpiresAt,
  });
}

function normalizeProvider(provider: string): "google" | "facebook" | null {
  const normalized = provider.trim().toLowerCase();
  if (normalized === "google" || normalized === "facebook") {
    return normalized;
  }

  return null;
}

function sanitizeUsernameBase(email: string): string {
  const base = email.split("@")[0]?.toLowerCase() ?? "user";
  const stripped = base.replace(/[^a-z0-9_]/g, "");
  return stripped.length >= 3 ? stripped.slice(0, 70) : `user${Date.now()}`;
}

async function generateUniqueUsername(email: string): Promise<string> {
  const base = sanitizeUsernameBase(email);

  for (let i = 0; i < 30; i += 1) {
    const suffix = i === 0 ? "" : `${Math.floor(Math.random() * 9000) + 1000}`;
    const candidate = `${base}${suffix}`.slice(0, 100);
    const exists = await authRepository.existsByUsername(candidate);
    if (!exists) {
      return candidate;
    }
  }

  return `user${Date.now()}`;
}

export async function register(input: RegisterRequest): Promise<AuthResponse> {
  try {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim();
    const currentLevel = input.currentLevel && input.currentLevel !== "unknown" ? input.currentLevel : null;

    const exists = await authRepository.existsByEmailOrUsername(email, username);
    if (exists) {
      return { success: false, message: "Email or username already exists" };
    }

    const passwordHash = await hashPassword(input.password);
    const userId = await authRepository.createUser({
      email,
      username,
      passwordHash,
      fullName: input.fullName?.trim() ?? null,
      currentLevel,
      role: USER_ROLE.CUSTOMER,
    });

    const user = toAuthResponseUser({
      userId,
      email,
      username,
      fullName: input.fullName?.trim() ?? null,
      avatar: null,
      currentLevel,
      role: USER_ROLE.CUSTOMER,
      status: USER_STATUS.ACTIVE,
      accountType: ACCOUNT_TYPE.FREE,
      premiumExpiresAt: null,
    });

    return {
      success: true,
      message: "Registration successful",
      token: signAccessToken(buildJwtPayload(user)),
      user,
    };
  } catch (error) {
    return {
      success: false,
      message: `Registration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function login(input: LoginRequest): Promise<AuthResponse> {
  try {
    const identity = input.emailOrUsername.trim();
    const user = await authRepository.findByEmailOrUsername(identity);
    if (!user) {
      return { success: false, message: "Invalid email/username or password" };
    }

    if (!user.passwordHash || user.passwordHash.trim().length === 0) {
      return {
        success: false,
        message: "This account uses social login. Please login with Google or Facebook.",
      };
    }

    const matched = await verifyPassword(input.password, user.passwordHash);
    if (!matched) {
      return { success: false, message: "Invalid email/username or password" };
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      return {
        success: false,
        message: `Account is ${user.status}. Please contact support.`,
      };
    }

    await authRepository.touchLastActive(user.id);

    const authUser = toAuthResponseUser({
      userId: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      avatar: user.avatarUrl,
      currentLevel: user.currentLevel,
      role: user.role,
      status: user.status,
      accountType: user.accountType,
      premiumExpiresAt: user.premiumExpiresAt,
    });

    return {
      success: true,
      message: "Login successful",
      token: signAccessToken(buildJwtPayload(authUser), input.rememberMe ?? false),
      user: authUser,
    };
  } catch (error) {
    return {
      success: false,
      message: `Login failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function oauthLogin(input: OAuthLoginRequest): Promise<AuthResponse> {
  try {
    const provider = normalizeProvider(input.provider);
    if (!provider) {
      return { success: false, message: "Unsupported OAuth provider" };
    }

    const email = input.email.trim().toLowerCase();
    const providerId = input.providerId.trim();
    const fullName = input.fullName?.trim() ?? null;
    const avatar = input.avatar?.trim() ?? null;

    let user =
      provider === "google"
        ? await authRepository.findByGoogleId(providerId)
        : await authRepository.findByFacebookId(providerId);

    if (!user) {
      user = await authRepository.findByEmail(email);

      if (user) {
        await authRepository.linkOAuthAndTouchLogin({
          userId: user.id,
          provider,
          providerId,
          fullName,
          avatarUrl: avatar,
        });
        user = await authRepository.findById(user.id);
      }
    }

    if (!user) {
      const username = await generateUniqueUsername(email);
      const userId = await authRepository.createOAuthUser({
        username,
        email,
        fullName,
        avatarUrl: avatar,
        provider,
        providerId,
      });

      user = await authRepository.findById(userId);
    } else {
      await authRepository.touchLastActive(user.id);
    }

    if (!user) {
      return { success: false, message: "OAuth login failed: User creation failed" };
    }

    const authUser = toAuthResponseUser({
      userId: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      avatar: user.avatarUrl,
      currentLevel: user.currentLevel,
      role: user.role,
      status: user.status,
      accountType: user.accountType,
      premiumExpiresAt: user.premiumExpiresAt,
    });

    return {
      success: true,
      message: "OAuth login successful",
      token: signAccessToken(buildJwtPayload(authUser)),
      user: authUser,
    };
  } catch (error) {
    return {
      success: false,
      message: `OAuth login failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function getUserById(userId: number): Promise<AuthUserSummary | null> {
  const user = await authRepository.findById(userId);
  if (!user) {
    return null;
  }

  return toAuthUserSummary({
    userId: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    avatar: user.avatarUrl,
    currentLevel: user.currentLevel,
    role: user.role,
    status: user.status,
    accountType: user.accountType,
    premiumExpiresAt: user.premiumExpiresAt?.toISOString() ?? null,
  });
}

export async function updateCurrentUserAvatar(
  userId: number,
  avatarUrl: string,
): Promise<AuthUserSummary | null> {
  await authRepository.updateAvatarUrl(userId, avatarUrl);
  return getUserById(userId);
}
