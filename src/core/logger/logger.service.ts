import { Injectable, LoggerService, Scope } from '@nestjs/common';

/**
 * Structured application logger with correlation ID support.
 * Outputs JSON in production, formatted text in development.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
  private context?: string;
  private correlationId?: string;

  setContext(context: string): void {
    this.context = context;
  }

  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  log(message: string, ...optionalParams: any[]): void {
    this.writeLog('INFO', message, optionalParams);
  }

  error(message: string, ...optionalParams: any[]): void {
    this.writeLog('ERROR', message, optionalParams);
  }

  warn(message: string, ...optionalParams: any[]): void {
    this.writeLog('WARN', message, optionalParams);
  }

  debug(message: string, ...optionalParams: any[]): void {
    this.writeLog('DEBUG', message, optionalParams);
  }

  verbose(message: string, ...optionalParams: any[]): void {
    this.writeLog('VERBOSE', message, optionalParams);
  }

  private writeLog(
    level: string,
    message: string,
    optionalParams: any[],
  ): void {
    const isProduction = process.env.APP_ENV === 'production';

    if (isProduction) {
      // Structured JSON logging for production
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        context: this.context || optionalParams[0] || 'Application',
        message,
        correlationId: this.correlationId,
        ...(optionalParams.length > 1 && { data: optionalParams.slice(1) }),
      };
      console.log(JSON.stringify(logEntry));
    } else {
      // Human-readable format for development
      const timestamp = new Date().toLocaleTimeString();
      const ctx = this.context || optionalParams[0] || 'Application';
      const correlationStr = this.correlationId
        ? ` [${this.correlationId.substring(0, 8)}]`
        : '';
      const coloredLevel = this.colorLevel(level);
      console.log(
        `${timestamp} ${coloredLevel} [${ctx}]${correlationStr} ${message}`,
      );
    }
  }

  private colorLevel(level: string): string {
    const colors: Record<string, string> = {
      INFO: '\x1b[32mINFO\x1b[0m',
      ERROR: '\x1b[31mERROR\x1b[0m',
      WARN: '\x1b[33mWARN\x1b[0m',
      DEBUG: '\x1b[36mDEBUG\x1b[0m',
      VERBOSE: '\x1b[35mVERBOSE\x1b[0m',
    };
    return colors[level] || level;
  }
}
