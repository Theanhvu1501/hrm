/**
 * Unit tests for migrated AuthServiceService methods (Task 5.1b):
 *   - getMe: proxies identityClient.getMe + getMyTenantsForApp, enriches with digital_book
 *   - switchTenant: proxies identityClient.switchTenant, enriches with digital_book
 *   - verify: JwtService (still local)
 *   - logout: still local no-op
 *
 * Mock strategy: stub IdentityClient + digital_book repos (AppUserRole, TenantAppConfig, PhanQuyen).
 * NO identity DB repos (UserRepository etc.) — they are removed in this task.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { AppUserRole, TenantAppConfig, PhanQuyen } from '@app/entities';
import { AuthServiceService } from './auth-service.service';
import { JwtService } from '@app/auth';
import { IdentityClient } from '@app/service-client';
import { ProvisioningService } from './provisioning/provisioning.service';

const TOKEN = 'Bearer eyJtest';
const USER_ID = 'user-111';
const TENANT_ID = 'tenant-222';

function stubRepo() {
  return {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    create: jest.fn((x: any) => ({ ...x })),
    save: jest.fn(async (x: any) => x),
    remove: jest.fn(async () => undefined),
  };
}

function makeIdentityClientStub() {
  return {
    getMe: jest.fn(),
    getMyTenantsForApp: jest.fn(),
    switchTenant: jest.fn(),
  };
}

async function buildService(overrides: {
  identityClient?: Partial<ReturnType<typeof makeIdentityClientStub>>;
  appUserRoleRepo?: any;
  tenantAppConfigRepo?: any;
  phanQuyenRepo?: any;
  provisioningService?: any;
} = {}) {
  const identityClientStub = {
    ...makeIdentityClientStub(),
    ...(overrides.identityClient ?? {}),
  };

  const jwtStub = {
    sign: jest.fn(() => 'master-token'),
    verify: jest.fn((token: string) => ({
      sub: USER_ID,
      email: 'user@test.com',
      tenantId: TENANT_ID,
      vaiTro: 'KIEM_SOAT',
      permissions: [],
    })),
    signTempToken: jest.fn(),
    verifyTempToken: jest.fn(),
  };

  const provisioningStub = overrides.provisioningService ?? {
    ensure: jest.fn(async () => undefined),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthServiceService,
      { provide: IdentityClient, useValue: identityClientStub },
      { provide: JwtService, useValue: jwtStub },
      { provide: ProvisioningService, useValue: provisioningStub },
      {
        provide: getRepositoryToken(AppUserRole),
        useValue: overrides.appUserRoleRepo ?? stubRepo(),
      },
      {
        provide: getRepositoryToken(TenantAppConfig),
        useValue: overrides.tenantAppConfigRepo ?? stubRepo(),
      },
      {
        provide: `${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`,
        useValue: overrides.phanQuyenRepo ?? stubRepo(),
      },
    ],
  }).compile();

  return {
    service: module.get<AuthServiceService>(AuthServiceService),
    identityClient: identityClientStub,
    jwtStub,
    provisioningStub,
  };
}

// ─── getMe ────────────────────────────────────────────────────────────────────

describe('AuthServiceService (migrated): getMe', () => {
  const identityUser = {
    id: USER_ID,
    email: 'user@test.com',
    hoTen: 'Test User',
    isSuperAdmin: false,
  };

  const identityTenant = {
    tenantId: TENANT_ID,
    tenantName: 'ACME Corp',
    tenantSlug: 'acme',
  };

  it('returns enriched response with availableTenants from nhan-su + current tenant', async () => {
    const appUserRoleRepo = stubRepo();
    appUserRoleRepo.findOne.mockResolvedValue({
      userId: USER_ID,
      tenantId: TENANT_ID,
      role: 'KE_TOAN_QUY',
      isActive: true,
    });

    const tenantAppConfigRepo = stubRepo();
    tenantAppConfigRepo.findOne.mockResolvedValue({
      tenantId: TENANT_ID,
      modules: ['KE_TOAN'],
      glossary: {},
      nganh: 'THUONG_MAI',
    });

    const phanQuyenRepo = stubRepo();
    phanQuyenRepo.findOne.mockResolvedValue({
      vaiTro: 'KE_TOAN_QUY',
      tenantId: TENANT_ID,
      permissions: ['view_phieu_thu'],
      isActive: true,
    });

    const { service } = await buildService({
      identityClient: {
        getMe: jest.fn(async () => ({
          success: true,
          data: { user: identityUser, tenant: identityTenant },
        })),
        getMyTenantsForApp: jest.fn(async () => ({
          success: true,
          data: [identityTenant],
        })),
      },
      appUserRoleRepo,
      tenantAppConfigRepo,
      phanQuyenRepo,
    });

    const result = await service.getMe(TOKEN, USER_ID, TENANT_ID);

    expect(result.user).toEqual(identityUser);
    expect(result.tenant).toMatchObject({
      tenantId: TENANT_ID,
      tenantName: 'ACME Corp',
      tenantSlug: 'acme',
      role: 'KE_TOAN_QUY',
      modules: ['KE_TOAN'],
      nganh: 'THUONG_MAI',
    });
    expect(result.availableTenants).toHaveLength(1);
    expect(result.availableTenants[0].tenantId).toBe(TENANT_ID);
    expect(result.permissions).toEqual(['view_phieu_thu']);
  });

  it('returns permissions [*] for super admin', async () => {
    const superAdminUser = { ...identityUser, isSuperAdmin: true };

    const { service } = await buildService({
      identityClient: {
        getMe: jest.fn(async () => ({
          success: true,
          data: { user: superAdminUser, tenant: identityTenant },
        })),
        getMyTenantsForApp: jest.fn(async () => ({
          success: true,
          data: [identityTenant],
        })),
      },
    });

    const result = await service.getMe(TOKEN, USER_ID, TENANT_ID);
    expect(result.permissions).toEqual(['*']);
  });

  it('defaults role to KIEM_SOAT when no AppUserRole record found', async () => {
    const appUserRoleRepo = stubRepo();
    appUserRoleRepo.findOne.mockResolvedValue(null); // no role row

    const phanQuyenRepo = stubRepo();
    phanQuyenRepo.findOne.mockResolvedValue({
      vaiTro: 'KIEM_SOAT',
      tenantId: TENANT_ID,
      permissions: ['view_only'],
      isActive: true,
    });

    const { service } = await buildService({
      identityClient: {
        getMe: jest.fn(async () => ({
          success: true,
          data: { user: identityUser, tenant: identityTenant },
        })),
        getMyTenantsForApp: jest.fn(async () => ({
          success: true,
          data: [identityTenant],
        })),
      },
      appUserRoleRepo,
      phanQuyenRepo,
    });

    const result = await service.getMe(TOKEN, USER_ID, TENANT_ID);
    expect(result.tenant?.role).toBe('KIEM_SOAT');
  });

  it('throws InternalServerErrorException when identityClient.getMe fails', async () => {
    const { service } = await buildService({
      identityClient: {
        getMe: jest.fn(async () => ({
          success: false,
          error: { code: 'INTERNAL', message: 'Identity down' },
        })),
        getMyTenantsForApp: jest.fn(async () => ({ success: true, data: [] })),
      },
    });

    await expect(service.getMe(TOKEN, USER_ID, TENANT_ID)).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('calls identityClient.getMyTenantsForApp with nhan-su', async () => {
    const getMyTenantsForApp = jest.fn(async () => ({
      success: true,
      data: [],
    }));

    const { service } = await buildService({
      identityClient: {
        getMe: jest.fn(async () => ({
          success: true,
          data: { user: identityUser, tenant: undefined },
        })),
        getMyTenantsForApp,
      },
    });

    await service.getMe(TOKEN, USER_ID, TENANT_ID);
    expect(getMyTenantsForApp).toHaveBeenCalledWith(TOKEN, 'nhan-su');
  });
});

// ─── switchTenant ─────────────────────────────────────────────────────────────

describe('AuthServiceService (migrated): switchTenant', () => {
  const identityUser = {
    id: USER_ID,
    email: 'user@test.com',
    hoTen: 'Test User',
    isSuperAdmin: false,
  };

  const identityTenantData = {
    tenantId: TENANT_ID,
    tenantName: 'ACME Corp',
    tenantSlug: 'acme',
  };

  it('returns enriched SelectTenantResponse with accessToken from identity', async () => {
    const appUserRoleRepo = stubRepo();
    appUserRoleRepo.findOne.mockResolvedValue({
      userId: USER_ID,
      tenantId: TENANT_ID,
      role: 'KE_TOAN_QUY',
      isActive: true,
    });

    const tenantAppConfigRepo = stubRepo();
    tenantAppConfigRepo.findOne.mockResolvedValue({
      tenantId: TENANT_ID,
      modules: ['KE_TOAN'],
      glossary: {},
      nganh: null,
    });

    const phanQuyenRepo = stubRepo();
    phanQuyenRepo.findOne.mockResolvedValue({
      vaiTro: 'KE_TOAN_QUY',
      tenantId: TENANT_ID,
      permissions: ['view_phieu_thu', 'create_phieu_thu'],
      isActive: true,
    });

    const identityAccessToken = 'identity-issued-token';

    const { service } = await buildService({
      identityClient: {
        switchTenant: jest.fn(async () => ({
          success: true,
          data: {
            accessToken: identityAccessToken,
            tenant: identityTenantData,
            user: identityUser,
          },
        })),
      },
      appUserRoleRepo,
      tenantAppConfigRepo,
      phanQuyenRepo,
    });

    const result = await service.switchTenant(TOKEN, USER_ID, TENANT_ID);

    expect(result.accessToken).toBe(identityAccessToken);
    expect(result.user).toEqual(identityUser);
    expect(result.tenant).toMatchObject({
      tenantId: TENANT_ID,
      tenantName: 'ACME Corp',
      tenantSlug: 'acme',
      role: 'KE_TOAN_QUY',
      modules: ['KE_TOAN'],
    });
    expect(result.permissions).toEqual(['view_phieu_thu', 'create_phieu_thu']);
  });

  it('returns permissions [*] for super admin', async () => {
    const superAdmin = { ...identityUser, isSuperAdmin: true };
    const { service } = await buildService({
      identityClient: {
        switchTenant: jest.fn(async () => ({
          success: true,
          data: {
            accessToken: 'admin-token',
            tenant: identityTenantData,
            user: superAdmin,
          },
        })),
      },
    });

    const result = await service.switchTenant(TOKEN, USER_ID, TENANT_ID);
    expect(result.permissions).toEqual(['*']);
  });

  it('throws when identity switchTenant fails', async () => {
    const { service } = await buildService({
      identityClient: {
        switchTenant: jest.fn(async () => ({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Không thuộc công ty' },
        })),
      },
    });

    await expect(service.switchTenant(TOKEN, USER_ID, TENANT_ID)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('calls identityClient.switchTenant with correct args', async () => {
    const switchTenantFn = jest.fn(async () => ({
      success: true,
      data: {
        accessToken: 'tok',
        tenant: identityTenantData,
        user: identityUser,
      },
    }));

    const { service } = await buildService({
      identityClient: { switchTenant: switchTenantFn },
    });

    await service.switchTenant(TOKEN, USER_ID, TENANT_ID);
    expect(switchTenantFn).toHaveBeenCalledWith(TOKEN, TENANT_ID);
  });

  it('calls provisioningService.ensure for tenant config', async () => {
    const provisioningService = { ensure: jest.fn(async () => undefined) };

    const { service } = await buildService({
      identityClient: {
        switchTenant: jest.fn(async () => ({
          success: true,
          data: {
            accessToken: 'tok',
            tenant: identityTenantData,
            user: identityUser,
          },
        })),
      },
      provisioningService,
    });

    await service.switchTenant(TOKEN, USER_ID, TENANT_ID);
    expect(provisioningService.ensure).toHaveBeenCalledWith(TENANT_ID, USER_ID, false);
  });
});

// ─── verify ───────────────────────────────────────────────────────────────────

describe('AuthServiceService (migrated): verify', () => {
  it('verifies token via JwtService and returns payload', async () => {
    const { service } = await buildService();
    const result = service.verify({ token: 'some.jwt.token' });
    expect(result.id).toBe(USER_ID);
    expect(result.email).toBe('user@test.com');
    expect(result.tenantId).toBe(TENANT_ID);
  });

  it('throws UnauthorizedException when jwtService.verify throws', async () => {
    const jwtStub = { verify: jest.fn(() => { throw new Error('invalid'); }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthServiceService,
        { provide: IdentityClient, useValue: makeIdentityClientStub() },
        { provide: JwtService, useValue: jwtStub },
        { provide: ProvisioningService, useValue: { ensure: jest.fn() } },
        { provide: getRepositoryToken(AppUserRole), useValue: stubRepo() },
        { provide: getRepositoryToken(TenantAppConfig), useValue: stubRepo() },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`, useValue: stubRepo() },
      ],
    }).compile();

    const service = module.get<AuthServiceService>(AuthServiceService);
    expect(() => service.verify({ token: 'bad' })).toThrow(UnauthorizedException);
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('AuthServiceService (migrated): logout', () => {
  it('returns success message', async () => {
    const { service } = await buildService();
    const result = service.logout(USER_ID);
    expect(result).toEqual({ message: 'Đăng xuất thành công' });
  });
});

// ─── static helpers ───────────────────────────────────────────────────────────

describe('AuthServiceService: static hash/compare', () => {
  it('hashPassword produces a bcrypt hash', async () => {
    const hash = await AuthServiceService.hashPassword('myPassword123');
    expect(hash).toMatch(/^\$2[ab]\$10\$/);
  });

  it('comparePassword returns true for matching password', async () => {
    const hash = await AuthServiceService.hashPassword('secret');
    expect(await AuthServiceService.comparePassword('secret', hash)).toBe(true);
    expect(await AuthServiceService.comparePassword('wrong', hash)).toBe(false);
  });
});
