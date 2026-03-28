import type { config as MsSqlConfig } from "mssql";
import type { SqlServerConfig } from "./types";

function readNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

export function loadSqlServerConfig(): SqlServerConfig {
  return {
    server: process.env.DB_HOST ?? "localhost",
    port: readNumber(process.env.DB_PORT, 1433),
    database: process.env.DB_NAME ?? "english_ai",
    user: process.env.DB_USER ?? "sa",
    password: process.env.DB_PASSWORD ?? "",
    encrypt: readBoolean(process.env.DB_ENCRYPT, false),
    trustServerCertificate: readBoolean(process.env.DB_TRUST_SERVER_CERTIFICATE, true),
    poolMin: readNumber(process.env.DB_POOL_MIN, 0),
    poolMax: readNumber(process.env.DB_POOL_MAX, 10),
    connectionTimeoutMs: readNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 15000),
    requestTimeoutMs: readNumber(process.env.DB_REQUEST_TIMEOUT_MS, 30000),
  };
}

export function toMsSqlConfig(cfg: SqlServerConfig): MsSqlConfig {
  return {
    server: cfg.server,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
    options: {
      encrypt: cfg.encrypt,
      trustServerCertificate: cfg.trustServerCertificate,
    },
    pool: {
      min: cfg.poolMin,
      max: cfg.poolMax,
    },
    connectionTimeout: cfg.connectionTimeoutMs,
    requestTimeout: cfg.requestTimeoutMs,
  };
}
