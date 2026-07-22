import { urlJoin } from "@/ultils/url-join";
import { Parser } from "./parser";
import Axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from "axios";
import { API_CONFIG, ApiError, ApiErrorType } from "@/config/api";
import { retryRequestOnce, type RetryableConfig } from "./reauth";
import { refreshFromIdentity, decodeTenantId } from "../identitySession";

export interface RequestOptions<T = unknown> extends AxiosRequestConfig {
  endpoint?: string;
  parser?: Parser<T>;
  passthroughErrorCatcher?: boolean;
}

export type ServiceOptions = {
  endpoint: string;
  baseUrl?: string;
};

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Singleton token manager
let authToken: string | null = null;

/**
 * Set the auth token for all API requests
 */
export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) {
    localStorage.setItem(API_CONFIG.AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(API_CONFIG.AUTH_TOKEN_KEY);
  }
}

/**
 * Get the current auth token
 */
export function getAuthToken(): string | null {
  if (!authToken) {
    authToken = localStorage.getItem(API_CONFIG.AUTH_TOKEN_KEY);
  }
  return authToken;
}

/**
 * Clear the auth token
 */
export function clearAuthToken(): void {
  authToken = null;
  localStorage.removeItem(API_CONFIG.AUTH_TOKEN_KEY);
}

/**
 * Rút câu tiếng Việt mà backend soạn sẵn ra khỏi body lỗi HTTP.
 *
 * `GlobalExceptionFilter` (be/libs/core/src/filters/global-exception.filter.ts)
 * bọc MỌI lỗi thành `{ success:false, error:{ code, message }, requestId }` —
 * KHÔNG có `message` ở gốc. Đọc `data.error.message` trước; `data.message`
 * (dạng phẳng cũ) chỉ là đường dự phòng, không phải đường chính, cho các
 * phản hồi còn ở dạng cũ. `message` đôi khi là mảng (lỗi validate dạng thô,
 * trước khi qua GlobalExceptionFilter) — nối lại thành một câu thay vì để
 * axios/JSON.stringify hiện "[object Object]" hay tương tự.
 */
export function resolveBackendMessage(data: unknown): string | undefined {
  const body = data as
    | {
        message?: string | string[];
        error?: { message?: string | string[] };
      }
    | undefined;
  const raw = body?.error?.message ?? body?.message;
  if (Array.isArray(raw)) {
    return raw.length > 0 ? raw.join('; ') : undefined;
  }
  return raw || undefined;
}

// Tenant management
const TENANT_STORAGE_KEY = 'current_tenant';

import type { TenantInfo } from '@/types';

/**
 * Set the current tenant
 */
export function setCurrentTenant(tenant: TenantInfo): void {
  localStorage.setItem(TENANT_STORAGE_KEY, JSON.stringify(tenant));
}

/**
 * Get the current tenant
 */
export function getCurrentTenant(): TenantInfo | null {
  const stored = localStorage.getItem(TENANT_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as TenantInfo;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Clear the current tenant
 */
export function clearCurrentTenant(): void {
  localStorage.removeItem(TENANT_STORAGE_KEY);
}

export class ServiceBase {
  private client: AxiosInstance;
  protected baseUrl: string;

  constructor(protected options: ServiceOptions) {
    this.baseUrl = options.baseUrl || API_CONFIG.BASE_URL;

    this.client = Axios.create({
      baseURL: this.baseUrl,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: API_CONFIG.TIMEOUT,
      transformRequest: [
        (data, headers) => {
          if (data instanceof FormData) {
            if (headers) {
              delete headers["Content-Type"];
            }
            return data;
          }
          return JSON.stringify(data);
        },
      ],
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = getAuthToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const apiError = this.handleError(error);

        // 401: thử silent refresh + replay đúng 1 lần trước khi logout
        if (apiError.type === ApiErrorType.UNAUTHORIZED) {
          const config = error.config as (AxiosRequestConfig & RetryableConfig) | undefined;
          if (config && !config._retry) {
            try {
              return await retryRequestOnce(config, {
                resolveTenantId: () =>
                  getCurrentTenant()?.tenantId ?? decodeTenantId(getAuthToken()),
                refresh: refreshFromIdentity,
                setToken: setAuthToken,
                replay: (c) => this.client(c as AxiosRequestConfig),
                onGiveUp: () => {
                  clearAuthToken();
                  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                },
              });
            } catch {
              return Promise.reject(apiError);
            }
          }
          // đã retry mà vẫn 401 (hoặc không có config): logout
          clearAuthToken();
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }

        return Promise.reject(apiError);
      }
    );
  }

  /**
   * Handle axios errors and convert to ApiError
   */
  private handleError(error: AxiosError): ApiError {
    if (error.code === 'ECONNABORTED') {
      return new ApiError(
        'Request timeout',
        ApiErrorType.TIMEOUT_ERROR,
        undefined,
        error
      );
    }

    if (!error.response) {
      return new ApiError(
        'Network error - please check your connection',
        ApiErrorType.NETWORK_ERROR,
        undefined,
        error
      );
    }

    const status = error.response.status;
    const data = error.response.data;
    const message = resolveBackendMessage(data) || error.message || 'An error occurred';

    switch (status) {
      case 401:
        return new ApiError(message, ApiErrorType.UNAUTHORIZED, status, error);
      case 403:
        return new ApiError(message, ApiErrorType.FORBIDDEN, status, error);
      case 404:
        return new ApiError(message, ApiErrorType.NOT_FOUND, status, error);
      case 422:
        return new ApiError(message, ApiErrorType.VALIDATION_ERROR, status, error);
      default:
        if (status >= 500) {
          return new ApiError(message, ApiErrorType.SERVER_ERROR, status, error);
        }
        return new ApiError(message, ApiErrorType.UNKNOWN_ERROR, status, error);
    }
  }

  private getAbsoluteRequestUrl(options?: RequestOptions): string {
    return urlJoin(this.options.endpoint, (options && options.endpoint) || "");
  }

  /**
   * Parse API response - extract data from { success: true, data: ... } format
   * Also supports paginated format { success: true, data: [...], total, page, limit, totalPages }
   */
  private parseResponse<T>(response: { success?: boolean; data?: T; meta?: unknown; message?: string; total?: number; page?: number; limit?: number; totalPages?: number }): T {
    if (response.success === false) {
      throw new ApiError(
        response.message || 'Request failed',
        ApiErrorType.SERVER_ERROR
      );
    }
    // If response has pagination fields at root level, return full response without success
    if (response.total !== undefined || response.page !== undefined) {
      const { success: _success, message: _message, ...rest } = response;
      return rest as T;
    }
    // If response has meta (pagination), return both data and meta
    if (response.meta !== undefined) {
      return { data: response.data, meta: response.meta } as T;
    }
    return response.data as T;
  }

  async get<T>(options?: RequestOptions): Promise<T> {
    const { data } = await this.client.get(
      this.getAbsoluteRequestUrl(options),
      options
    );
    return this.parseResponse<T>(data);
  }

  async post<T>(postData: unknown, options?: RequestOptions): Promise<T> {
    const { data } = await this.client.post(
      this.getAbsoluteRequestUrl(options),
      postData,
      options
    );
    return this.parseResponse<T>(data);
  }

  async put<T>(putData: unknown, options?: RequestOptions): Promise<T> {
    const { data } = await this.client.put(
      this.getAbsoluteRequestUrl(options),
      putData,
      options
    );
    return this.parseResponse<T>(data);
  }

  async patch<T>(patchData: unknown, options?: RequestOptions): Promise<T> {
    const { data } = await this.client.patch(
      this.getAbsoluteRequestUrl(options),
      patchData,
      options
    );
    return this.parseResponse<T>(data);
  }

  async delete<T>(options?: RequestOptions): Promise<T> {
    const { data } = await this.client.delete(
      this.getAbsoluteRequestUrl(options),
      options
    );
    return this.parseResponse<T>(data);
  }

  /**
   * Xóa mềm hàng loạt: POST <endpoint>/delete-batch với { ids }.
   * BE trả { success, data: { deleted, skipped } }; `skipped` là số dòng bị guard chặn
   * (vd đề xuất mua đã duyệt) — lô vẫn xóa được phần còn lại.
   */
  async deleteBatch(ids: string[]): Promise<{ deleted: number; skipped: number }> {
    return this.post<{ deleted: number; skipped: number }>(
      { ids },
      { endpoint: '/delete-batch' }
    );
  }
}
