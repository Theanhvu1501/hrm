import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseServiceClient } from './service-client.base';
import { ServiceResponse } from './interfaces/service-response.interface';

@Injectable()
export class IdentityClient extends BaseServiceClient {
  constructor(configService: ConfigService) {
    super(configService);
  }

  private authed(
    token: string,
    extra?: Record<string, string>,
  ): Record<string, string> {
    return { Authorization: token, ...(extra ?? {}) };
  }

  // -------- Users --------

  listUsers(
    token: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): Promise<ServiceResponse<any>> {
    return this.request('identity', 'GET', '/api/admin/users', {
      headers: this.authed(token),
      query,
    });
  }

  createUser(
    token: string,
    body: Record<string, unknown>,
  ): Promise<ServiceResponse<any>> {
    return this.request('identity', 'POST', '/api/admin/users', {
      headers: this.authed(token),
      body,
    });
  }

  updateUser(
    token: string,
    id: string,
    body: Record<string, unknown>,
  ): Promise<ServiceResponse<any>> {
    return this.request('identity', 'PUT', `/api/admin/users/${id}`, {
      headers: this.authed(token),
      body,
    });
  }

  resetPassword(
    token: string,
    id: string,
    body: Record<string, unknown>,
  ): Promise<ServiceResponse<any>> {
    return this.request(
      'identity',
      'POST',
      `/api/admin/users/${id}/reset-password`,
      {
        headers: this.authed(token),
        body,
      },
    );
  }

  toggleUserStatus(
    token: string,
    id: string,
  ): Promise<ServiceResponse<any>> {
    return this.request(
      'identity',
      'PATCH',
      `/api/admin/users/${id}/toggle-status`,
      {
        headers: this.authed(token),
      },
    );
  }

  deleteUser(token: string, id: string): Promise<ServiceResponse<any>> {
    return this.request('identity', 'DELETE', `/api/admin/users/${id}`, {
      headers: this.authed(token),
    });
  }

  // -------- Members --------

  listMembers(
    token: string,
    tenantId: string,
  ): Promise<ServiceResponse<any>> {
    return this.request(
      'identity',
      'GET',
      `/api/admin/tenants/${tenantId}/members`,
      {
        headers: this.authed(token),
      },
    );
  }

  addMember(
    token: string,
    tenantId: string,
    body: Record<string, unknown>,
  ): Promise<ServiceResponse<any>> {
    return this.request(
      'identity',
      'POST',
      `/api/admin/tenants/${tenantId}/members`,
      {
        headers: this.authed(token),
        body,
      },
    );
  }

  updateMember(
    token: string,
    tenantId: string,
    userId: string,
    body: Record<string, unknown>,
  ): Promise<ServiceResponse<any>> {
    return this.request(
      'identity',
      'PUT',
      `/api/admin/tenants/${tenantId}/members/${userId}`,
      {
        headers: this.authed(token),
        body,
      },
    );
  }

  removeMember(
    token: string,
    tenantId: string,
    userId: string,
  ): Promise<ServiceResponse<any>> {
    return this.request(
      'identity',
      'DELETE',
      `/api/admin/tenants/${tenantId}/members/${userId}`,
      {
        headers: this.authed(token),
      },
    );
  }

  // -------- Tenants --------

  listTenants(
    token: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): Promise<ServiceResponse<any>> {
    return this.request('identity', 'GET', '/api/admin/tenants', {
      headers: this.authed(token),
      query,
    });
  }

  createTenant(
    token: string,
    body: Record<string, unknown>,
  ): Promise<ServiceResponse<any>> {
    return this.request('identity', 'POST', '/api/admin/tenants', {
      headers: this.authed(token),
      body,
    });
  }

  updateTenant(
    token: string,
    id: string,
    body: Record<string, unknown>,
  ): Promise<ServiceResponse<any>> {
    return this.request('identity', 'PUT', `/api/admin/tenants/${id}`, {
      headers: this.authed(token),
      body,
    });
  }

  deleteTenant(token: string, id: string): Promise<ServiceResponse<any>> {
    return this.request('identity', 'DELETE', `/api/admin/tenants/${id}`, {
      headers: this.authed(token),
    });
  }

  getTenantApps(token: string, id: string): Promise<ServiceResponse<any>> {
    return this.request('identity', 'GET', `/api/admin/tenants/${id}/apps`, {
      headers: this.authed(token),
    });
  }

  setTenantApps(
    token: string,
    id: string,
    body: Record<string, unknown>,
  ): Promise<ServiceResponse<any>> {
    return this.request('identity', 'PUT', `/api/admin/tenants/${id}/apps`, {
      headers: this.authed(token),
      body,
    });
  }

  // -------- Me (platform) --------

  getMe(token: string): Promise<ServiceResponse<any>> {
    return this.request('identity', 'GET', '/api/me', {
      headers: this.authed(token),
    });
  }

  getMyApps(token: string): Promise<ServiceResponse<any>> {
    return this.request('identity', 'GET', '/api/me/apps', {
      headers: this.authed(token),
    });
  }

  getMyTenantsForApp(token: string, app: string): Promise<ServiceResponse<any>> {
    return this.request('identity', 'GET', '/api/me/tenants', {
      headers: this.authed(token),
      query: { app },
    });
  }

  switchTenant(token: string, tenantId: string): Promise<ServiceResponse<any>> {
    return this.request('identity', 'POST', '/api/switch-tenant', {
      headers: this.authed(token),
      body: { tenantId },
    });
  }
}
