/**
 * API Configuration
 * Centralized configuration for API endpoints and settings
 */

export const API_CONFIG = {
  /**
   * Base URL for API requests
   * Uses VITE_API_BASE_URL environment variable or defaults to localhost
   */
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',

  /**
   * Request timeout in milliseconds (30 seconds)
   */
  TIMEOUT: 30000,

  /**
   * Auth token storage key in localStorage
   */
  AUTH_TOKEN_KEY: 'auth_token',

  /**
   * Refresh token storage key in localStorage
   */
  REFRESH_TOKEN_KEY: 'refresh_token',
};

/**
 * API Error Types
 */
export enum ApiErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  type: ApiErrorType;
  statusCode?: number;
  originalError?: unknown;

  constructor(
    message: string,
    type: ApiErrorType = ApiErrorType.UNKNOWN_ERROR,
    statusCode?: number,
    originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

/**
 * Lấy message hiển thị cho người dùng từ lỗi API.
 * Khi server có phản hồi (statusCode) → dùng message thật từ backend
 * (vd "Người dùng đã là thành viên của công ty này"); còn lại → fallback.
 */
/**
 * Mã lỗi MIỀN do backend ném kèm (`GlobalExceptionFilter` ưu tiên `resp.code`
 * hơn mã suy từ HTTP status). Dùng khi FE phải xử lý khác nhau cho nhiều tình
 * huống cùng một status — vd 409 "đã có hợp đồng" thì hỏi lại chứ không báo
 * lỗi đỏ như 409 "đã đủ 2 hợp đồng xác định thời hạn".
 *
 * So khớp theo MÃ, không theo câu chữ tiếng Việt: câu chữ sẽ đổi và khi đó
 * nhánh xử lý hỏng im lặng.
 */
export function apiErrorCode(error: unknown): string | undefined {
  const goc = (error as { originalError?: unknown })?.originalError;
  const data = (goc as { response?: { data?: unknown } })?.response?.data;
  const ma = (data as { error?: { code?: unknown } })?.error?.code;
  return typeof ma === "string" ? ma : undefined;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.statusCode && error.message) {
    return error.message;
  }
  return fallback;
}

/**
 * API Response interfaces
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
