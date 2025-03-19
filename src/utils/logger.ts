// Define log levels and their priorities
const LogLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
} as const;

type LogLevel = keyof typeof LogLevels;

// Get log level from environment variable, default to INFO
const currentLogLevel = (process.env.LOG_LEVEL?.toUpperCase() as LogLevel) || 'INFO';

const shouldLog = (level: LogLevel): boolean => {
  return LogLevels[level] <= LogLevels[currentLogLevel];
};

// Format message for stderr
const formatMessage = (level: LogLevel, message: string, context?: Record<string, unknown>): string => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `${timestamp} [${level}] ${message}${contextStr}\n`;
};

// Re-export the logger for consistent usage across the application
export const logger = {
  error: (message: string, context?: Record<string, unknown>) => {
    if (shouldLog('ERROR')) {
      process.stderr.write(formatMessage('ERROR', message, context));
    }
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    if (shouldLog('WARN')) {
      process.stderr.write(formatMessage('WARN', message, context));
    }
  },
  info: (message: string, context?: Record<string, unknown>) => {
    if (shouldLog('INFO')) {
      process.stderr.write(formatMessage('INFO', message, context));
    }
  },
  debug: (message: string, context?: Record<string, unknown>) => {
    if (shouldLog('DEBUG')) {
      process.stderr.write(formatMessage('DEBUG', message, context));
    }
  }
};

// Ensure no direct console.log usage
export const logError = (errorOrMessage: Error | string, context?: Record<string, unknown>): void => {
  if (errorOrMessage instanceof Error) {
    logger.error(errorOrMessage.message, { error: errorOrMessage.stack, ...context });
  } else {
    logger.error(errorOrMessage, context);
  }
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