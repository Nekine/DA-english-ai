import { AppError } from "../errors/app-error";
import { ERROR_CODES } from "../errors/error-codes";
import { HTTP_STATUS } from "../constants/http-status";

export interface AppEnv {
  NODE_ENV: "development" | "test" | "production";
  PORT: number;
  JWT_SECRET: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  JWT_EXPIRE_MINUTES: number;
  DB_ENABLED: boolean;
  DB_URL: string;
}

function readString(name: string, required = true, fallback?: string): string {
  const value = process.env[name] ?? fallback ?? "";

  if (required && value.trim().length === 0) {
    throw new AppError(
      `Missing required environment variable: ${name}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_ERROR,
      { envVar: name },
    );
  }

  return value;
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new AppError(
      `Environment variable ${name} must be a number`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_ERROR,
      { envVar: name, rawValue: raw },
    );
  }

  return parsed;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw || raw.trim().length === 0) {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function loadEnv(): AppEnv {
  const nodeEnvRaw = readString("NODE_ENV", false, "development");
  const nodeEnv =
    nodeEnvRaw === "production" || nodeEnvRaw === "test" ? nodeEnvRaw : "development";
  const isProduction = nodeEnv === "production";
  const dbEnabledDefault = isProduction;

  return {
    NODE_ENV: nodeEnv,
    PORT: readNumber("PORT", 3000),
    JWT_SECRET: readString("JWT_SECRET", isProduction, "dev-jwt-secret-change-me"),
    JWT_ISSUER: readString("JWT_ISSUER", false, "EngAce"),
    JWT_AUDIENCE: readString("JWT_AUDIENCE", false, "EngAceUsers"),
    JWT_EXPIRE_MINUTES: readNumber("JWT_EXPIRE_MINUTES", 60),
    DB_ENABLED: readBoolean("DB_ENABLED", dbEnabledDefault),
    DB_URL: readString("DB_URL", isProduction, "mssql://localhost/english_ai"),
  };
}
