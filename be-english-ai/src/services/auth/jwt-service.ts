import jwt from "jsonwebtoken";
import { appConfig } from "../../config";
import { HTTP_STATUS } from "../../constants/http-status";
import { AppError } from "../../errors/app-error";
import { ERROR_CODES } from "../../errors/error-codes";
import type { AuthTokenPayload, AuthUserSummary } from "../../types/auth";

interface JwtSignPayload {
  sub: string;
  email: string;
  role: AuthTokenPayload["role"];
}

export function buildJwtPayload(user: AuthUserSummary): JwtSignPayload {
  return {
    sub: String(user.userId),
    email: user.email,
    role: user.role,
  };
}

export function signAccessToken(payload: JwtSignPayload, rememberMe = false): string {
  const expireMinutes = rememberMe
    ? appConfig.jwt.expireMinutes * 24 * 30
    : appConfig.jwt.expireMinutes;

  return jwt.sign(payload, appConfig.jwt.secret, {
    algorithm: "HS256",
    issuer: appConfig.jwt.issuer,
    audience: appConfig.jwt.audience,
    expiresIn: `${expireMinutes}m`,
  });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  try {
    const decoded = jwt.verify(token, appConfig.jwt.secret, {
      algorithms: ["HS256"],
      issuer: appConfig.jwt.issuer,
      audience: appConfig.jwt.audience,
    });

    if (typeof decoded === "string") {
      throw new AppError(
        "Invalid token payload",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.INVALID_TOKEN,
      );
    }

    return {
      sub: decoded.sub ?? "",
      email: String(decoded.email ?? ""),
      role: decoded.role as AuthTokenPayload["role"],
      iat: Number(decoded.iat ?? 0),
      exp: Number(decoded.exp ?? 0),
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(
        "Token has expired",
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_EXPIRED,
      );
    }

    throw new AppError(
      "Invalid authentication token",
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.INVALID_TOKEN,
      error,
    );
  }
}

export function parseBearerToken(authHeader: string | undefined): string {
  if (!authHeader) {
    throw new AppError(
      "Authorization header is required",
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.AUTH_REQUIRED,
    );
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AppError(
      "Authorization header must use Bearer token",
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.INVALID_TOKEN,
    );
  }

  return token;
}
