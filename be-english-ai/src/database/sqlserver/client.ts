import sql from "mssql";
import { AppError } from "../../errors/app-error";
import { ERROR_CODES } from "../../errors/error-codes";
import { HTTP_STATUS } from "../../constants/http-status";
import { logger } from "../../utils/logger";
import { loadSqlServerConfig, toMsSqlConfig } from "./config";

let pool: sql.ConnectionPool | null = null;

function buildWindowsConnectionString(cfg: ReturnType<typeof loadSqlServerConfig>): string {
  return [
    `Driver={${cfg.odbcDriver}}`,
    `Server=${cfg.server}${cfg.port ? `,${cfg.port}` : ""}`,
    `Database=${cfg.database}`,
    "Trusted_Connection=Yes",
    `Encrypt=${cfg.encrypt ? "Yes" : "No"}`,
    `TrustServerCertificate=${cfg.trustServerCertificate ? "Yes" : "No"}`,
  ].join(";");
}

export async function getDbPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  const cfg = loadSqlServerConfig();

  try {
    if (cfg.authMode === "windows") {
      const sqlWindowsModule = await import("mssql/msnodesqlv8");
      const sqlWindows = sqlWindowsModule.default as unknown as typeof sql;

      pool = await sqlWindows.connect({
        connectionString: buildWindowsConnectionString(cfg),
        options: {
          trustedConnection: true,
          encrypt: cfg.encrypt,
          trustServerCertificate: cfg.trustServerCertificate,
        },
        pool: {
          min: cfg.poolMin,
          max: cfg.poolMax,
        },
        connectionTimeout: cfg.connectionTimeoutMs,
        requestTimeout: cfg.requestTimeoutMs,
      } as unknown as sql.config);
    } else {
      if (!cfg.user || !cfg.password) {
        throw new AppError(
          "DB_USER and DB_PASSWORD are required when DB_AUTH_MODE=sql",
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_CODES.DATABASE_ERROR,
        );
      }

      const msSqlConfig = toMsSqlConfig(cfg);
      pool = await sql.connect(msSqlConfig);
    }

    logger.info("SQL Server connection pool initialized", {
      server: cfg.server,
      database: cfg.database,
      port: cfg.port,
      authMode: cfg.authMode,
    });

    return pool;
  } catch (error) {
    logger.error("Failed to initialize SQL Server pool", {
      error: error instanceof Error ? error.message : "unknown_error",
    });

    throw new AppError(
      "Unable to connect SQL Server",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.DATABASE_ERROR,
      error,
    );
  }
}

export async function closeDbPool(): Promise<void> {
  if (!pool) {
    return;
  }

  await pool.close();
  pool = null;
  logger.info("SQL Server connection pool closed");
}
