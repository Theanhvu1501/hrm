import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { RequestContext } from '../services/request-context/request-context.service';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  requestId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Map status to error code
      code = this.getErrorCode(status);

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || message;

        // Handle validation errors
        if (Array.isArray(resp.message)) {
          message = 'Validation failed';
          details = { validation: resp.message };
        }

        // Mã lỗi miền (nếu service có ném kèm) được ưu tiên hơn mã suy từ
        // HTTP status.
        //
        // Lý do: nhiều tình huống nghiệp vụ khác nhau cùng dùng chung một
        // status. Ví dụ module `thiet-bi-cham-cong` phát ra 7 mã đều là HTTP
        // 403 (THIET_BI_CHO_DUYET, THIET_BI_BI_TU_CHOI, THIET_BI_BI_THU_HOI,
        // ...) mà FE phải hiện màn hình khác nhau cho từng mã. Nếu ghi đè hết
        // thành 'FORBIDDEN' thì FE chỉ còn cách so khớp chuỗi tiếng Việt —
        // đúng thứ mã lỗi sinh ra để tránh, và sẽ hỏng im lặng ngay khi ai đó
        // sửa câu chữ thông báo.
        //
        // Chỉ nhận chuỗi không rỗng: `code` kiểu số/null/object có thể tới từ
        // thư viện ngoài hoặc payload do client nặn ra, không phải hợp đồng
        // lỗi của mình — gặp thì bỏ qua và giữ nguyên mã suy từ status.
        if (typeof resp.code === 'string' && resp.code.trim().length > 0) {
          code = resp.code;
        }
      }
    }

    // Correlation id for this request — surfaced to the client so it can be
    // quoted to support and grepped across service logs.
    const requestId = RequestContext.getRequestId();

    // Log error with stack trace (not exposed to client)
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      ...(requestId && { requestId }),
    };

    response.status(status).json(errorResponse);
  }

  private getErrorCode(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.BAD_GATEWAY:
        return 'BAD_GATEWAY';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
