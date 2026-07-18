import { LoggerService } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { RequestContext } from '../services/request-context/request-context.service';

/**
 * Winston-format that stamps every log entry with the current request's
 * correlation id, read from the per-request AsyncLocalStorage. Logs emitted
 * outside a request scope simply have no requestId.
 */
const injectRequestId = winston.format((info) => {
  const requestId = RequestContext.getRequestId();
  if (requestId) {
    info.requestId = requestId;
  }
  return info;
});

/** Human-readable, single-line format used for the console transport. */
const consoleFormat = winston.format.combine(
  injectRequestId(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ level: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, context, requestId, stack } =
      info as winston.Logform.TransformableInfo & {
        timestamp?: string;
        context?: string;
        requestId?: string;
        stack?: string;
      };
    const ctx = context ? `[${context}] ` : '';
    const rid = requestId ? `[${requestId}] ` : '';
    return `${timestamp} ${level} ${rid}${ctx}${stack || message}`;
  }),
);

/** Structured JSON format used for the file transports (ELK/Loki friendly). */
const fileFormat = winston.format.combine(
  injectRequestId(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/**
 * Build a Nest `LoggerService` backed by Winston for a given microservice.
 *
 * Transports:
 *  - console (always)
 *  - {service}-%DATE%.log        — all levels, daily rotation
 *  - {service}-error-%DATE%.log  — error level only
 *
 * Log directory is `LOG_DIR` (default `logs`). On the production single-container
 * deployment this directory must be mounted to a volume to survive restarts.
 *
 * Pass the result to `NestFactory.create(Module, { logger })` so that bootstrap
 * logs and every existing `new Logger()` call are routed through it.
 */
export function createAppLogger(serviceName: string): LoggerService {
  const logDir = process.env.LOG_DIR || 'logs';
  const level = process.env.LOG_LEVEL || 'info';

  return WinstonModule.createLogger({
    level,
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.Console({ format: consoleFormat }),
      new winston.transports.DailyRotateFile({
        dirname: logDir,
        filename: `${serviceName}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: fileFormat,
      }),
      new winston.transports.DailyRotateFile({
        level: 'error',
        dirname: logDir,
        filename: `${serviceName}-error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: fileFormat,
      }),
    ],
  });
}
