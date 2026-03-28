import sql from "mssql";
import { AppError } from "../../errors/app-error";
import { ERROR_CODES } from "../../errors/error-codes";
import { HTTP_STATUS } from "../../constants/http-status";
import { logger } from "../../utils/logger";
import { loadSqlServerConfig, toMsSqlConfig } from "./config";

let pool: sql.ConnectionPool | null = null;

export async function getDbPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  const cfg = loadSqlServerConfig();
  if (!cfg.password) {
    throw new AppError(
      "DB_PASSWORD is required for SQL Server connection",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.DATABASE_ERROR,
    );
  }

  const msSqlConfig = toMsSqlConfig(cfg);

  try {
    pool = await sql.connect(msSqlConfig);
    logger.info("SQL Server connection pool initialized", {
      server: cfg.server,
      database: cfg.database,
      port: cfg.port,
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
