import { Server } from "@modelcontextprotocol/sdk/server/index.js";

// Re-export the server's logger for consistent usage across the application
export const logger = Server.logger;

// Ensure no direct console.log usage
export const logError = (error: Error, context?: Record<string, unknown>): void => {
  logger.error(error.message, { error, ...context });
};

export const logInfo = (message: string, context?: Record<string, unknown>): void => {
  logger.info(message, context);
};

export const logDebug = (message: string, context?: Record<string, unknown>): void => {
  logger.debug(message, context);
};

export const logWarn = (message: string, context?: Record<string, unknown>): void => {
  logger.warn(message, context);
}; 