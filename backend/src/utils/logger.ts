/**
 * Logger Utility - Structured Logging with Winston
 * 
 * Provides structured logging with configurable levels, formats, and transports.
 * Includes semantic methods with icons for visual log scanning.
 * 
 * Usage:
 *   import logger from '../utils/logger';
 *   logger.success('Database connected');
 *   logger.fail('Operation failed', { error: err.message });
 *   logger.search('Searching for jobs', { query, location });
 */

import { createLogger, format, transports, Logger } from 'winston';

// Lazy initialization to avoid circular dependency with configService
let loggerInstance: Logger | null = null;

// Log levels with their numeric priority
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

/**
 * Get logger configuration from environment or defaults
 */
const getLoggerConfig = () => {
  return {
    level: (process.env.LOG_LEVEL || 'info') as LogLevel,
    enableConsole: process.env.LOG_CONSOLE !== 'false',
    enableFile: process.env.LOG_FILE === 'true',
    errorLogFile: process.env.LOG_ERROR_FILE || 'logs/error.log',
    combinedLogFile: process.env.LOG_COMBINED_FILE || 'logs/combined.log',
    enableJson: process.env.LOG_FORMAT === 'json',
    maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '5242880', 10),
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10)
  };
};

/**
 * Custom format for structured logging
 */
const structuredFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

/**
 * JSON format for production/log aggregation systems
 */
const jsonFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

/**
 * Create and configure the Winston logger instance
 */
const createLoggerInstance = (): Logger => {
  const config = getLoggerConfig();
  const logTransports: (transports.ConsoleTransportInstance | transports.FileTransportInstance)[] = [];

  if (config.enableConsole) {
    logTransports.push(
      new transports.Console({
        format: format.combine(
          format.colorize({ all: true }),
          structuredFormat
        )
      })
    );
  }

  if (config.enableFile) {
    logTransports.push(
      new transports.File({
        filename: config.errorLogFile,
        level: 'error',
        format: config.enableJson ? jsonFormat : structuredFormat,
        maxsize: config.maxFileSize,
        maxFiles: config.maxFiles
      })
    );
    logTransports.push(
      new transports.File({
        filename: config.combinedLogFile,
        format: config.enableJson ? jsonFormat : structuredFormat,
        maxsize: config.maxFileSize,
        maxFiles: config.maxFiles
      })
    );
  }

  return createLogger({
    level: config.level,
    levels: LOG_LEVELS,
    format: config.enableJson ? jsonFormat : structuredFormat,
    transports: logTransports,
    exitOnError: false
  });
};

const getLogger = (): Logger => {
  if (!loggerInstance) {
    loggerInstance = createLoggerInstance();
  }
  return loggerInstance;
};

// ============================================================================
// ICONS - Centralized icon definitions for consistency
// ============================================================================
const ICONS = {
  success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️',
  start: '🚀', stop: '🛑', processing: '⚙️', complete: '✅',
  skip: '⏭️', retry: '🔄',
  found: '📦', notFound: '🔍❌', search: '🔍',
  create: '➕', delete: '🗑️', update: '📝',
  connect: '🔗', disconnect: '🔌',
  database: '🗄️', cache: '💨', api: '🌐', auth: '🔐',
  email: '📧', calendar: '📅',
  agent: '🤖', job: '💼', travel: '✈️', learning: '📚',
  shopping: '🛒', cooking: '🍳', news: '📰', diy: '🔧',
  config: '⚙️', init: '🔧', user: '👤', time: '⏱️'
} as const;

type IconKey = keyof typeof ICONS;

/**
 * Logger wrapper with typed methods and semantic icon methods
 */
const logger = {
  // Standard log levels
  error: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().error(message, metadata);
  },
  warn: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().warn(message, metadata);
  },
  info: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().info(message, metadata);
  },
  http: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().http(message, metadata);
  },
  verbose: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().verbose(message, metadata);
  },
  debug: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().debug(message, metadata);
  },

  // Semantic methods with icons
  success: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().info(`${ICONS.success} ${message}`, metadata);
  },
  fail: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().error(`${ICONS.error} ${message}`, metadata);
  },
  start: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().info(`${ICONS.start} ${message}`, metadata);
  },
  stop: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().warn(`${ICONS.stop} ${message}`, metadata);
  },
  processing: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().info(`${ICONS.processing} ${message}`, metadata);
  },
  complete: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().info(`${ICONS.complete} ${message}`, metadata);
  },
  skip: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().info(`${ICONS.skip} ${message}`, metadata);
  },
  retry: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().warn(`${ICONS.retry} ${message}`, metadata);
  },
  found: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().info(`${ICONS.found} ${message}`, metadata);
  },
  search: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().info(`${ICONS.search} ${message}`, metadata);
  },
  connect: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().info(`${ICONS.connect} ${message}`, metadata);
  },
  disconnect: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().info(`${ICONS.disconnect} ${message}`, metadata);
  },
  init: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().info(`${ICONS.init} ${message}`, metadata);
  },

  // Service-specific methods
  db: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().info(`${ICONS.database} ${message}`, metadata);
  },
  cache: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().debug(`${ICONS.cache} ${message}`, metadata);
  },
  api: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().info(`${ICONS.api} ${message}`, metadata);
  },
  auth: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().info(`${ICONS.auth} ${message}`, metadata);
  },
  email: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().info(`${ICONS.email} ${message}`, metadata);
  },
  agent: (message: string, metadata?: Record<string, unknown>): void => {
    getLogger().info(`${ICONS.agent} ${message}`, metadata);
  },

  // Flexible icon method
  withIcon: (
    icon: IconKey | string,
    message: string,
    level: LogLevel = 'info',
    metadata?: Record<string, unknown>
  ): void => {
    const iconChar = icon in ICONS ? ICONS[icon as IconKey] : icon;
    getLogger().log(level, `${iconChar} ${message}`, metadata);
  },

  // Utility methods
  child: (defaultMetadata: Record<string, unknown>) => {
    const childLogger = getLogger().child(defaultMetadata);
    return {
      error: (msg: string, meta?: Record<string, unknown>) => childLogger.error(msg, meta),
      warn: (msg: string, meta?: Record<string, unknown>) => childLogger.warn(msg, meta),
      info: (msg: string, meta?: Record<string, unknown>) => childLogger.info(msg, meta),
      debug: (msg: string, meta?: Record<string, unknown>) => childLogger.debug(msg, meta),
      success: (msg: string, meta?: Record<string, unknown>) => childLogger.info(`${ICONS.success} ${msg}`, meta),
      fail: (msg: string, meta?: Record<string, unknown>) => childLogger.error(`${ICONS.error} ${msg}`, meta)
    };
  },

  timed: (label: string, startTime: number, metadata?: Record<string, unknown>): void => {
    const duration = Date.now() - startTime;
    getLogger().info(`${ICONS.time} ${label}`, { durationMs: duration, ...metadata });
  },

  icons: ICONS,
  getInstance: (): Logger => getLogger()
};

export default logger;
