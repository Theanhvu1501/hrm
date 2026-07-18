import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

export interface ErrorResponse {
  code: number;
  message: string;
  details?: any;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    let httpStatus: number;
    let message: string;
    let details: any;

    try {
      if (exception instanceof HttpException) {
        httpStatus = exception.getStatus();
        const response = exception.getResponse();

        if (typeof response === 'string') {
          message = response;
        } else if (typeof response === 'object' && response !== null) {
          message = (response as any).message || exception.message;
          details = (response as any).details || (response as any).error;
        } else {
          message = exception.message;
        }
      } else if (exception instanceof Error) {
        // Handle custom error messages
        const errorMessage = exception.message.toLowerCase();

        // Map common error messages to appropriate HTTP status
        if (
          errorMessage.includes('not_found') ||
          errorMessage.includes('not found')
        ) {
          httpStatus = HttpStatus.NOT_FOUND;
          message = 'Resource not found';
        } else if (
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('forbidden')
        ) {
          httpStatus = HttpStatus.UNAUTHORIZED;
          message = exception.message;
        } else if (
          errorMessage.includes('bad_request') ||
          errorMessage.includes('invalid')
        ) {
          httpStatus = HttpStatus.BAD_REQUEST;
          message = exception.message;
        } else if (
          errorMessage.includes('conflict') ||
          errorMessage.includes('duplicate')
        ) {
          httpStatus = HttpStatus.CONFLICT;
          message = exception.message;
        } else {
          httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
          message = exception.message || 'Internal server error';
        }
      } else if (typeof exception === 'string') {
        httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        message = exception;
      } else {
        httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Internal server error';
      }

      // Map HTTP status code to application error code
      const errorCode = this.mapStatusToErrorCode(httpStatus);

      // Log error details
      this.logger.error(
        `Error occurred: ${message}`,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );

      const errorResponse: ErrorResponse = {
        code: errorCode,
        message,
        ...(details && { details }),
      };

      httpAdapter.reply(ctx.getResponse(), errorResponse, httpStatus);
    } catch (error) {
      // Fallback error handling to prevent app crash
      this.logger.error('Critical error in exception filter', error);

      const fallbackResponse: ErrorResponse = {
        code: 5000,
        message: 'Internal server error',
      };

      httpAdapter.reply(
        ctx.getResponse(),
        fallbackResponse,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private mapStatusToErrorCode(status: number): number {
    const errorCodeMap: Record<number, number> = {
      [HttpStatus.BAD_REQUEST]: 4000,
      [HttpStatus.UNAUTHORIZED]: 4010,
      [HttpStatus.FORBIDDEN]: 4030,
      [HttpStatus.NOT_FOUND]: 4040,
      [HttpStatus.INTERNAL_SERVER_ERROR]: 5000,
    };

    return errorCodeMap[status] || status * 10;
  }
}
