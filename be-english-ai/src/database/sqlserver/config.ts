import type { config as MsSqlConfig } from "mssql";
import type { SqlServerConfig } from "./types";

type ParsedDbUrl = {
  server?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  encrypt?: boolean;
  trustServerCertificate?: boolean;
};

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

function readAuthMode(value: string | undefined): "windows" | "sql" {
  if (!value) {
    return "windows";
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "sql" ? "sql" : "windows";
}

function parseDbUrl(raw: string | undefined): ParsedDbUrl | null {
  if (!raw || raw.trim().length === 0) {
    return null;
  }

  try {
    const url = new URL(raw);
    if (!url.protocol.toLowerCase().startsWith("mssql")) {
      return null;
    }

    const database = url.pathname.replace(/^\//, "").trim() || undefined;
    const port = url.port ? readNumber(url.port, 1433) : undefined;
    const user = url.username ? decodeURIComponent(url.username) : undefined;
    const password = url.password ? decodeURIComponent(url.password) : undefined;
    const encryptParam = url.searchParams.get("encrypt");
    const trustServerCertificateParam = url.searchParams.get("trustServerCertificate");

    return {
      ...(url.hostname ? { server: url.hostname } : {}),
      ...(typeof port === "number" ? { port } : {}),
      ...(database ? { database } : {}),
      ...(user ? { user } : {}),
      ...(password ? { password } : {}),
      ...(encryptParam ? { encrypt: readBoolean(encryptParam, false) } : {}),
      ...(trustServerCertificateParam
        ? { trustServerCertificate: readBoolean(trustServerCertificateParam, true) }
        : {}),
    };
  } catch {
    return null;
  }
}

export function loadSqlServerConfig(): SqlServerConfig {
  const parsedDbUrl = parseDbUrl(process.env.DB_URL);
  const authMode = readAuthMode(
    process.env.DB_AUTH_MODE
    ?? ((parsedDbUrl?.user || parsedDbUrl?.password) ? "sql" : undefined),
  );
  const server = process.env.DB_HOST ?? parsedDbUrl?.server ?? "NEEKINE";
  const port = readNumber(process.env.DB_PORT, parsedDbUrl?.port ?? 1433);
  const database = process.env.DB_NAME ?? parsedDbUrl?.database ?? "english_ai";
  const encrypt = readBoolean(process.env.DB_ENCRYPT, parsedDbUrl?.encrypt ?? false);
  const trustServerCertificate = readBoolean(
    process.env.DB_TRUST_SERVER_CERTIFICATE,
    parsedDbUrl?.trustServerCertificate ?? true,
  );
  const user = process.env.DB_USER ?? parsedDbUrl?.user ?? "sa";
  const password = process.env.DB_PASSWORD ?? parsedDbUrl?.password ?? "";

  return {
    server,
    port,
    database,
    authMode,
    ...(authMode === "sql"
      ? {
          user,
          password,
        }
      : {}),
    odbcDriver: process.env.DB_ODBC_DRIVER ?? "ODBC Driver 17 for SQL Server",
    encrypt,
    trustServerCertificate,
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
