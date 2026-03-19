import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";

import { config } from "./config.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./logger.js";
import healthRoutes from "./routes/healthRoutes.js";
import metadataRoutes from "./routes/metadataRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.frontendOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      }
    })
  );
  app.use(express.json());
  app.use(
    pinoHttp({
      logger
    })
  );

  app.use("/health", healthRoutes);
  app.use("/metadata", metadataRoutes);
  app.use("/sessions", sessionRoutes);

  app.use((_request, response) => {
    response.status(404).json({
      error: {
        message: "Route not found",
        statusCode: 404
      }
    });
  });

  app.use(errorHandler);

  return app;
}
