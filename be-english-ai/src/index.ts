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

async function startServer(): Promise<void> {
	loadApiKeysFromFiles();
	await logDatabaseConnectionStatus();

	const app = createApp();
	const port = appConfig.port;
	const server = app.listen(port, () => {
		logger.info("HTTP server started", {
			env: appConfig.env,
			port,
			dbEnabled: appConfig.db.enabled,
		});
	});

	server.on("error", (error: NodeJS.ErrnoException) => {
		logger.error("HTTP server startup/runtime error", {
			message: error.message,
			stack: error.stack,
		});
	});
}

void startServer();
