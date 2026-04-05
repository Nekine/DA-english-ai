import cors from "cors";
import express, { type Request, type Response } from "express";
import path from "node:path";
import { authContextMiddleware } from "./middlewares/auth-context";
import { errorHandlerMiddleware, notFoundMiddleware } from "./middlewares/error-handler";
import { apiRoutes } from "./routes";
import { logger } from "./utils/logger";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use("/images", express.static(path.resolve(process.cwd(), "images")));

  app.use((req, res, next) => {
    const startedAt = Date.now();

    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      const context = {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
      };

      if (res.statusCode >= 500) {
        logger.error("HTTP request failed", context);
        return;
      }

      if (res.statusCode >= 400) {
        logger.warn("HTTP request warning", context);
        return;
      }

      logger.info("HTTP request completed", context);
    });

    next();
  });

  app.use(authContextMiddleware);

  app.get("/", (_req: Request, res: Response) => {
    res.json({ success: true, message: "be-english-ai is running" });
  });

  app.use("/api", apiRoutes);
  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
