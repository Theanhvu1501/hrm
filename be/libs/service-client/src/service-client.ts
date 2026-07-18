import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestOptions, ServiceResponse } from './interfaces';
import { BaseServiceClient } from './service-client.base';

@Injectable()
export class ServiceClient extends BaseServiceClient {
  constructor(configService: ConfigService) {
    super(configService);
  }

  // ============ Generic Methods ============

  async get<T>(
    serviceName: string,
    path: string,
    options?: Omit<RequestOptions, 'body'>,
  ): Promise<ServiceResponse<T>> {
    return this.request<T>(serviceName, 'GET', path, options);
  }

  async post<T>(
    serviceName: string,
    path: string,
    options?: RequestOptions,
  ): Promise<ServiceResponse<T>> {
    return this.request<T>(serviceName, 'POST', path, options);
  }

  async put<T>(
    serviceName: string,
    path: string,
    options?: RequestOptions,
  ): Promise<ServiceResponse<T>> {
    return this.request<T>(serviceName, 'PUT', path, options);
  }

  async delete<T>(
    serviceName: string,
    path: string,
    options?: Omit<RequestOptions, 'body'>,
  ): Promise<ServiceResponse<T>> {
    return this.request<T>(serviceName, 'DELETE', path, options);
  }
}
