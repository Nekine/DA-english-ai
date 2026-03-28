import { createApp } from "./app";
import { appConfig } from "./config";
import { loadApiKeysFromFiles } from "./config/api-key-loader";
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

function startServerWithRetry(): void {
	loadApiKeysFromFiles();

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

startServerWithRetry();
