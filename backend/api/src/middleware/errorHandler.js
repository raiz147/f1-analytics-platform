import { logger } from "../logger.js";

export function errorHandler(error, request, response, next) {
  const statusCode = error.statusCode ?? 500;

  logger.error(
    {
      err: error,
      path: request.path,
      method: request.method
    },
    "Request failed"
  );

  response.status(statusCode).json({
    error: {
      message:
        statusCode === 500 ? "Internal server error" : error.message,
      statusCode
    }
  });
}
