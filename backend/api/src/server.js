import { createApp } from "./app.js";
import { config } from "./config.js";
import { closePool } from "./db/pool.js";
import { logger } from "./logger.js";

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, "API server listening");
});

async function shutdown(signal) {
  logger.info({ signal }, "Shutting down API server");
  server.close(async (error) => {
    if (error) {
      logger.error({ err: error }, "Error while closing HTTP server");
      process.exitCode = 1;
    }

    try {
      await closePool();
    } catch (poolError) {
      logger.error({ err: poolError }, "Error while closing database pool");
      process.exitCode = 1;
    } finally {
      process.exit();
    }
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
