import { createApp } from "./app";
import { appConfig } from "./config";
import { loadApiKeysFromFiles } from "./config/api-key-loader";
import { getDbPool } from "./database";
import { logger } from "./utils/logger";

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", {
    reason: reason instanceof Error ? reason.stack ?? reason.message : String(reason),
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    message: error.message,
    stack: error.stack,
  });
});

async function logDatabaseConnectionStatus(): Promise<void> {
	if (!appConfig.db.enabled) {
		logger.warn("Database connection check skipped", {
			dbEnabled: false,
			reason: "DB_ENABLED is false",
		});
		return;
	}

	try {
		const pool = await getDbPool();
		const probe = await pool.request().query<{
			ServerName: string;
			DatabaseName: string;
			LoginName: string;
		}>(`
			SELECT
				@@SERVERNAME AS ServerName,
				DB_NAME() AS DatabaseName,
				SUSER_SNAME() AS LoginName
		`);

		const row = probe.recordset[0];
		logger.info("Database connection check succeeded", {
			connected: true,
			server: row?.ServerName ?? "unknown",
			database: row?.DatabaseName ?? "unknown",
			loginName: row?.LoginName ?? "unknown",
		});
	} catch (error) {
		logger.error("Database connection check failed", {
			connected: false,
			message: error instanceof Error ? error.message : String(error),
		});
	}
}

async function startServerWithRetry(): Promise<void> {
	loadApiKeysFromFiles();
	await logDatabaseConnectionStatus();

	const app = createApp();
	const basePort = appConfig.port;
	const maxAttempts = appConfig.env === "production" ? 1 : 10;

	const tryListen = (attempt: number): void => {
		const port = basePort + attempt;
		const server = app.listen(port, () => {
			logger.info("HTTP server started", {
				env: appConfig.env,
				port,
				dbEnabled: appConfig.db.enabled,
			});
		});

		server.on("error", (error: NodeJS.ErrnoException) => {
			const isAddressInUse = error.code === "EADDRINUSE";
			const hasMoreAttempts = attempt + 1 < maxAttempts;

			if (isAddressInUse && hasMoreAttempts) {
				logger.warn("Port is in use, retrying with next port", {
					attemptedPort: port,
					nextPort: basePort + attempt + 1,
				});
				return tryListen(attempt + 1);
			}

			logger.error("HTTP server startup/runtime error", {
				message: error.message,
				stack: error.stack,
			});
		});
	};

	tryListen(0);
}

void startServerWithRetry();
