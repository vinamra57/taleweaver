/**
 * Simple Logger Utility
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}`;

    switch (level) {
      case 'debug':
      case 'info':
        console.log(logMessage, data !== undefined ? data : '');
        break;
      case 'warn':
        console.warn(logMessage, data !== undefined ? data : '');
        break;
      case 'error':
        console.error(logMessage, data !== undefined ? data : '');
        break;
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: unknown): void {
    this.log('error', message, error);
  }
}

// Factory function to create loggers
export function createLogger(context: string): Logger {
  return new Logger(context);
}
