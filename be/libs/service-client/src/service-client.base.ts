import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestContext, REQUEST_ID_HEADER } from '@app/core';
import * as http from 'http';
import {
  ServiceClientConfig,
  RequestOptions,
  HttpMethod,
} from './interfaces/service-client.interface';
import {
  ServiceResponse,
  ServiceError,
} from './interfaces/service-response.interface';

// Map HTTP status → mã lỗi ngữ nghĩa, khớp với GlobalExceptionFilter và với
// throwFromServiceError phía service gọi (NOT_FOUND/CONFLICT/... → đúng exception).
const STATUS_CODE_MAP: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  502: 'BAD_GATEWAY',
};

@Injectable()
export abstract class BaseServiceClient {
  protected configs: Map<string, ServiceClientConfig> = new Map();
  protected defaultTimeout = 30000;

  constructor(protected readonly configService: ConfigService) {}

  protected getServiceConfig(serviceName: string): ServiceClientConfig {
    if (!this.configs.has(serviceName)) {
      const config = this.loadServiceConfig(serviceName);
      this.configs.set(serviceName, config);
    }
    return this.configs.get(serviceName)!;
  }

  protected loadServiceConfig(serviceName: string): ServiceClientConfig {
    const envPrefix = serviceName.toUpperCase().replace(/-/g, '_');

    const serviceUrl =
      this.configService.get<string>(`${envPrefix}_SERVICE_URL`) ||
      this.configService.get<string>(`SERVICE_${envPrefix}_URL`);

    let host = 'localhost';
    let port = 3000;
    let resolved = false;

    if (serviceUrl) {
      try {
        const url = new URL(serviceUrl);
        host = url.hostname;
        port = parseInt(url.port, 10) || 3000;
        resolved = true;
      } catch {
        console.warn(
          `[ServiceClient] Invalid URL for ${serviceName}: "${serviceUrl}". Trying HOST/PORT vars.`,
        );
      }
    }

    const hostOverride =
      this.configService.get<string>(`SERVICE_${envPrefix}_HOST`) ||
      this.configService.get<string>(`${envPrefix}_SERVICE_HOST`);
    const portOverride =
      this.configService.get<number>(`SERVICE_${envPrefix}_PORT`) ||
      this.configService.get<number>(`${envPrefix}_SERVICE_PORT`);

    if (hostOverride) { host = hostOverride; resolved = true; }
    if (portOverride) { port = portOverride; resolved = true; }

    if (!resolved) {
      console.warn(
        `[ServiceClient] No env config found for "${serviceName}". ` +
        `Checked: ${envPrefix}_SERVICE_URL, SERVICE_${envPrefix}_URL, ` +
        `SERVICE_${envPrefix}_HOST/PORT, ${envPrefix}_SERVICE_HOST/PORT. ` +
        `Falling back to ${host}:${port} — this will likely cause routing errors.`,
      );
    }

    return {
      serviceName,
      host,
      port,
      timeout:
        this.configService.get<number>(`SERVICE_${envPrefix}_TIMEOUT`) ||
        this.defaultTimeout,
    };
  }

  protected async request<T>(
    serviceName: string,
    method: HttpMethod,
    path: string,
    options?: RequestOptions,
  ): Promise<ServiceResponse<T>> {
    const config = this.getServiceConfig(serviceName);
    const queryString = this.buildQueryString(options?.query);
    const fullPath = queryString ? `${path}?${queryString}` : path;

    // Propagate the correlation id so the called service logs under the same
    // requestId. Pulled from the current request's AsyncLocalStorage; an
    // explicit header in options takes precedence.
    const requestId = RequestContext.getRequestId();

    return new Promise((resolve) => {
      const requestOptions: http.RequestOptions = {
        hostname: config.host,
        port: config.port,
        path: fullPath,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(requestId ? { [REQUEST_ID_HEADER]: requestId } : {}),
          ...options?.headers,
        },
        timeout: options?.timeout || config.timeout,
      };

      const req = http.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => (data += chunk.toString()));
        res.on('end', () => {
          try {
            const response = JSON.parse(data) as ServiceResponse<T> & {
              message?: string;
            };
            if (res.statusCode && res.statusCode >= 400) {
              resolve(this.mapHttpError<T>(res.statusCode, response));
            } else {
              resolve(response);
            }
          } catch {
            resolve(
              this.createErrorResponse<T>(
                'PARSE_ERROR',
                'Failed to parse response',
                data,
              ),
            );
          }
        });
      });

      req.on('error', (error: Error) => {
        resolve(
          this.createErrorResponse<T>(
            'SERVICE_UNAVAILABLE',
            `Service ${serviceName} unavailable: ${error.message}`,
          ),
        );
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(
          this.createErrorResponse<T>(
            'REQUEST_TIMEOUT',
            `Request to ${serviceName} timed out`,
          ),
        );
      });

      if (options?.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  protected buildQueryString(
    query?: Record<string, string | number | boolean | undefined>,
  ): string {
    if (!query) return '';
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    }
    return params.toString();
  }

  /**
   * Chuyển body lỗi HTTP (status ≥ 400) thành ServiceResponse thất bại với mã
   * ngữ nghĩa + message thật. Hỗ trợ 2 shape:
   *  - Service nội bộ (GlobalExceptionFilter): { error: { code, message, details } }
   *  - NestJS mặc định (vd identity-service):   { statusCode, message, error: "Conflict" }
   */
  protected mapHttpError<T>(
    statusCode: number,
    body: unknown,
  ): ServiceResponse<T> {
    const resp = (body ?? {}) as { error?: unknown; message?: string };
    const err = resp.error;
    const errObj =
      err && typeof err === 'object' ? (err as ServiceError) : undefined;
    const code =
      errObj?.code || STATUS_CODE_MAP[statusCode] || `HTTP_ERROR_${statusCode}`;
    const message =
      errObj?.message || resp.message || `HTTP Error ${statusCode}`;
    return this.createErrorResponse<T>(code, message, errObj?.details);
  }

  protected createErrorResponse<T>(
    code: string,
    message: string,
    details?: unknown,
  ): ServiceResponse<T> {
    const error: ServiceError = { code, message };
    if (details !== undefined) {
      error.details = details;
    }
    return { success: false, error };
  }
}
