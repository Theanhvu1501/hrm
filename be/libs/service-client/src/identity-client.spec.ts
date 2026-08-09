import { ConfigService } from '@nestjs/config';
import { IdentityClient } from './identity-client';

describe('IdentityClient', () => {
  let client: IdentityClient;
  let requestSpy: jest.SpyInstance;

  const token = 'Bearer eyJtest.token.here';
  const mockSuccess = { success: true, data: {} };

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    client = new IdentityClient(configService);
    requestSpy = jest
      .spyOn(client as any, 'request')
      .mockResolvedValue(mockSuccess);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------- Users --------

  describe('listUsers', () => {
    it('calls GET /api/admin/users with Authorization header', async () => {
      await client.listUsers(token);
      expect(requestSpy).toHaveBeenCalledWith('identity', 'GET', '/api/admin/users', {
        headers: { Authorization: token },
        query: undefined,
      });
    });

    it('forwards query params', async () => {
      const query = { page: 1, limit: 20 };
      await client.listUsers(token, query);
      expect(requestSpy).toHaveBeenCalledWith('identity', 'GET', '/api/admin/users', {
        headers: { Authorization: token },
        query,
      });
    });
  });

  describe('createUser', () => {
    it('calls POST /api/admin/users with body and auth', async () => {
      const body = { email: 'a@b.com', password: 'pw' };
      await client.createUser(token, body);
      expect(requestSpy).toHaveBeenCalledWith('identity', 'POST', '/api/admin/users', {
        headers: { Authorization: token },
        body,
      });
    });
  });

  describe('updateUser', () => {
    it('calls PUT /api/admin/users/:id', async () => {
      const body = { fullName: 'Test' };
      await client.updateUser(token, 'u1', body);
      expect(requestSpy).toHaveBeenCalledWith('identity', 'PUT', '/api/admin/users/u1', {
        headers: { Authorization: token },
        body,
      });
    });
  });

  describe('resetPassword', () => {
    it('calls POST /api/admin/users/:id/reset-password', async () => {
      const body = { newPassword: 'newpw' };
      await client.resetPassword(token, 'u2', body);
      expect(requestSpy).toHaveBeenCalledWith(
        'identity',
        'POST',
        '/api/admin/users/u2/reset-password',
        {
          headers: { Authorization: token },
          body,
        },
      );
    });
  });

  describe('toggleUserStatus', () => {
    it('calls PATCH /api/admin/users/:id/toggle-status', async () => {
      await client.toggleUserStatus(token, 'u3');
      expect(requestSpy).toHaveBeenCalledWith(
        'identity',
        'PATCH',
        '/api/admin/users/u3/toggle-status',
        {
          headers: { Authorization: token },
        },
      );
    });
  });

  describe('deleteUser', () => {
    it('calls DELETE /api/admin/users/:id with Authorization header', async () => {
      await client.deleteUser(token, 'u-del');
      expect(requestSpy).toHaveBeenCalledWith(
        'identity',
        'DELETE',
        '/api/admin/users/u-del',
        {
          headers: { Authorization: token },
        },
      );
    });
  });

  // -------- Members --------

  describe('listMembers', () => {
    it('calls GET /api/admin/tenants/:tenantId/members', async () => {
      await client.listMembers(token, 'tenant1');
      expect(requestSpy).toHaveBeenCalledWith(
        'identity',
        'GET',
        '/api/admin/tenants/tenant1/members',
        {
          headers: { Authorization: token },
        },
      );
    });
  });

  describe('addMember', () => {
    it('calls POST /api/admin/tenants/:tenantId/members', async () => {
      const body = { userId: 'u4', role: 'member' };
      await client.addMember(token, 'tenant1', body);
      expect(requestSpy).toHaveBeenCalledWith(
        'identity',
        'POST',
        '/api/admin/tenants/tenant1/members',
        {
          headers: { Authorization: token },
          body,
        },
      );
    });
  });

  describe('updateMember', () => {
    it('calls PUT /api/admin/tenants/:tenantId/members/:userId with 2 path params', async () => {
      const body = { role: 'admin' };
      await client.updateMember(token, 'tenant1', 'u5', body);
      expect(requestSpy).toHaveBeenCalledWith(
        'identity',
        'PUT',
        '/api/admin/tenants/tenant1/members/u5',
        {
          headers: { Authorization: token },
          body,
        },
      );
    });
  });

  describe('removeMember', () => {
    it('calls DELETE /api/admin/tenants/:tenantId/members/:userId', async () => {
      await client.removeMember(token, 'tenant1', 'u6');
      expect(requestSpy).toHaveBeenCalledWith(
        'identity',
        'DELETE',
        '/api/admin/tenants/tenant1/members/u6',
        {
          headers: { Authorization: token },
        },
      );
    });
  });

  // -------- Tenants --------

  describe('listTenants', () => {
    it('calls GET /api/admin/tenants', async () => {
      await client.listTenants(token);
      expect(requestSpy).toHaveBeenCalledWith('identity', 'GET', '/api/admin/tenants', {
        headers: { Authorization: token },
        query: undefined,
      });
    });

    it('forwards query params', async () => {
      const query = { search: 'acme' };
      await client.listTenants(token, query);
      expect(requestSpy).toHaveBeenCalledWith('identity', 'GET', '/api/admin/tenants', {
        headers: { Authorization: token },
        query,
      });
    });
  });

  describe('createTenant', () => {
    it('calls POST /api/admin/tenants', async () => {
      const body = { name: 'Acme' };
      await client.createTenant(token, body);
      expect(requestSpy).toHaveBeenCalledWith('identity', 'POST', '/api/admin/tenants', {
        headers: { Authorization: token },
        body,
      });
    });
  });

  describe('updateTenant', () => {
    it('calls PUT /api/admin/tenants/:id', async () => {
      const body = { name: 'Acme Updated' };
      await client.updateTenant(token, 't1', body);
      expect(requestSpy).toHaveBeenCalledWith('identity', 'PUT', '/api/admin/tenants/t1', {
        headers: { Authorization: token },
        body,
      });
    });
  });

  describe('deleteTenant', () => {
    it('calls DELETE /api/admin/tenants/:id', async () => {
      await client.deleteTenant(token, 't1');
      expect(requestSpy).toHaveBeenCalledWith('identity', 'DELETE', '/api/admin/tenants/t1', {
        headers: { Authorization: token },
      });
    });
  });

  describe('getTenantApps', () => {
    it('calls GET /api/admin/tenants/:id/apps', async () => {
      await client.getTenantApps(token, 't2');
      expect(requestSpy).toHaveBeenCalledWith(
        'identity',
        'GET',
        '/api/admin/tenants/t2/apps',
        {
          headers: { Authorization: token },
        },
      );
    });
  });

  describe('setTenantApps', () => {
    it('calls PUT /api/admin/tenants/:id/apps with body', async () => {
      const body = { appIds: ['app1', 'app2'] };
      await client.setTenantApps(token, 't2', body);
      expect(requestSpy).toHaveBeenCalledWith(
        'identity',
        'PUT',
        '/api/admin/tenants/t2/apps',
        {
          headers: { Authorization: token },
          body,
        },
      );
    });
  });

  // -------- Me (platform) --------

  describe('getMe', () => {
    it('calls GET /api/me with Authorization header', async () => {
      await client.getMe(token);
      expect(requestSpy).toHaveBeenCalledWith('identity', 'GET', '/api/me', {
        headers: { Authorization: token },
      });
    });
  });

  describe('getMyApps', () => {
    it('calls GET /api/me/apps with Authorization header', async () => {
      await client.getMyApps(token);
      expect(requestSpy).toHaveBeenCalledWith('identity', 'GET', '/api/me/apps', {
        headers: { Authorization: token },
      });
    });
  });

  describe('getMyTenantsForApp', () => {
    it('calls GET /api/me/tenants with Authorization header and query app', async () => {
      await client.getMyTenantsForApp(token, 'master-seo');
      expect(requestSpy).toHaveBeenCalledWith('identity', 'GET', '/api/me/tenants', {
        headers: { Authorization: token },
        query: { app: 'master-seo' },
      });
    });
  });

  describe('switchTenant', () => {
    it('calls POST /api/switch-tenant with tenantId in body and Authorization header', async () => {
      await client.switchTenant(token, 'tenant-123');
      expect(requestSpy).toHaveBeenCalledWith('identity', 'POST', '/api/switch-tenant', {
        headers: { Authorization: token },
        body: { tenantId: 'tenant-123' },
      });
    });
  });

  describe('listDepartments', () => {
    it('calls GET /api/me/departments with Authorization header', async () => {
      await client.listDepartments(token);
      expect(requestSpy).toHaveBeenCalledWith('identity', 'GET', '/api/me/departments', {
        headers: { Authorization: token },
      });
    });
  });
});
