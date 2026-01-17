/**
 * Frontend Logger Service
 * 
 * Provides structured logging for the frontend application.
 * In development, logs to console with formatting.
 * In production, could be extended to send logs to a monitoring service.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  component?: string;
}

class FrontendLogger {
  private isDevelopment = import.meta.env.DEV;

  /**
   * Format log entry for console output
   */
  private formatLog(entry: LogEntry): string {
    const parts = [entry.message];
    if (entry.component) {
      parts.unshift(`[${entry.component}]`);
    }
    return parts.join(' ');
  }

  /**
   * Log with specified level
   */
  private log(level: LogLevel, message: string, context?: LogContext, component?: string): void {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      component
    };

    // In development, log to console
    if (this.isDevelopment) {
      const formattedMessage = this.formatLog(entry);
      
      switch (level) {
        case 'debug':
          if (context) {
            console.debug(formattedMessage, context);
          } else {
            console.debug(formattedMessage);
          }
          break;
        case 'info':
          if (context) {
            console.info(formattedMessage, context);
          } else {
            console.info(formattedMessage);
          }
          break;
        case 'warn':
          if (context) {
            console.warn(formattedMessage, context);
          } else {
            console.warn(formattedMessage);
          }
          break;
        case 'error':
          if (context) {
            console.error(formattedMessage, context);
          } else {
            console.error(formattedMessage);
          }
          break;
      }
    }

    // In production, could send to monitoring service
    // Example: sendToMonitoring(entry);
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Error level logging
   */
  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Create a scoped logger for a specific component
   */
  scope(component: string): ScopedLogger {
    return new ScopedLogger(this, component);
  }
}

/**
 * Scoped logger for component-specific logging
 */
class ScopedLogger {
  constructor(
    private parent: FrontendLogger,
    private component: string
  ) {}

  debug(message: string, context?: LogContext): void {
    this.parent.debug(`[${this.component}] ${message}`, context);
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(`[${this.component}] ${message}`, context);
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(`[${this.component}] ${message}`, context);
  }

  error(message: string, context?: LogContext): void {
    this.parent.error(`[${this.component}] ${message}`, context);
  }
}

// Export singleton instance
export const logger = new FrontendLogger();
export default logger;

