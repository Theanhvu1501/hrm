/**
 * Unit tests for ProvisioningService.ensure
 *
 * TDD: test spec written before implementation.
 *
 * Cases:
 *  (1) Idempotent TenantAppConfig: config already exists → NOT call create/save for TenantAppConfig
 *  (2) isCompanyAdmin=false → only TenantAppConfig provisioned, no VaiTro/PhanQuyen/AppUserRole
 *  (3) isCompanyAdmin=true, all missing → creates VaiTro, PhanQuyen (full perms), AppUserRole
 *  (4) isCompanyAdmin=true, PhanQuyen exists but permissions empty → update permissions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { PhanQuyen, VaiTro, AppUserRole, TenantAppConfig } from '@app/entities';
import { generateAllPermissions } from '@app/core';
import { ProvisioningService } from './provisioning.service';

const TENANT_ID = 'tenant-abc';
const USER_ID = 'user-xyz';

function stubRepo() {
  return {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    create: jest.fn((x: any) => ({ ...x })),
    save: jest.fn(async (x: any) => x),
    remove: jest.fn(async () => undefined),
  };
}

async function buildService(overrides: Record<string, any> = {}) {
  const defaults: Record<string, any> = {
    [getRepositoryToken(AppUserRole) as string]: stubRepo(),
    [getRepositoryToken(TenantAppConfig) as string]: stubRepo(),
    [`${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`]: stubRepo(),
    [`${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`]: stubRepo(),
  };

  const merged = { ...defaults, ...overrides };
  const providers = Object.entries(merged).map(([token, value]) => ({
    provide: token,
    useValue: value,
  }));

  const module: TestingModule = await Test.createTestingModule({
    providers: [ProvisioningService, ...providers],
  }).compile();

  const service = module.get<ProvisioningService>(ProvisioningService);
  return { service, repos: merged };
}

describe('ProvisioningService.ensure', () => {
  describe('(1) Idempotent TenantAppConfig: config already exists → no save', () => {
    it('skips create/save when TenantAppConfig already exists', async () => {
      const appConfigRepo = stubRepo();
      appConfigRepo.findOne.mockResolvedValue({ tenantId: TENANT_ID, modules: ['KE_TOAN'] });

      const { service } = await buildService({
        [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
      });

      // Call twice
      await service.ensure(TENANT_ID, USER_ID, false);
      await service.ensure(TENANT_ID, USER_ID, false);

      expect(appConfigRepo.create).not.toHaveBeenCalled();
      expect(appConfigRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('(2) isCompanyAdmin=false → only TenantAppConfig, no Admin role data', () => {
    it('creates TenantAppConfig but does NOT create VaiTro/PhanQuyen/AppUserRole', async () => {
      const appConfigRepo = stubRepo();
      appConfigRepo.findOne.mockResolvedValue(null); // missing

      const vaiTroRepo = stubRepo();
      const phanQuyenRepo = stubRepo();
      const appUserRoleRepo = stubRepo();

      const { service } = await buildService({
        [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
        [`${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`]: vaiTroRepo,
        [`${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`]: phanQuyenRepo,
        [getRepositoryToken(AppUserRole) as string]: appUserRoleRepo,
      });

      await service.ensure(TENANT_ID, USER_ID, false);

      // Config should be created
      expect(appConfigRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_ID, modules: ['KE_TOAN'] }),
      );
      expect(appConfigRepo.save).toHaveBeenCalled();

      // Admin role data should NOT be touched
      expect(vaiTroRepo.create).not.toHaveBeenCalled();
      expect(phanQuyenRepo.create).not.toHaveBeenCalled();
      expect(appUserRoleRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('(3) isCompanyAdmin=true, all missing → creates everything', () => {
    it('creates VaiTro, PhanQuyen with full permissions, AppUserRole', async () => {
      const appConfigRepo = stubRepo();
      appConfigRepo.findOne.mockResolvedValue(null); // config missing → will be created

      const vaiTroRepo = stubRepo();
      vaiTroRepo.findOne.mockResolvedValue(null);

      const phanQuyenRepo = stubRepo();
      phanQuyenRepo.findOne.mockResolvedValue(null);

      const appUserRoleRepo = stubRepo();
      appUserRoleRepo.findOne.mockResolvedValue(null);

      const { service } = await buildService({
        [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
        [`${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`]: vaiTroRepo,
        [`${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`]: phanQuyenRepo,
        [getRepositoryToken(AppUserRole) as string]: appUserRoleRepo,
      });

      await service.ensure(TENANT_ID, USER_ID, true);

      // TenantAppConfig should be created (was missing)
      expect(appConfigRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_ID, modules: ['KE_TOAN'] }),
      );
      expect(appConfigRepo.save).toHaveBeenCalled();

      // VaiTro should be created
      expect(vaiTroRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ ten: 'Admin', isActive: true }),
      );
      expect(vaiTroRepo.save).toHaveBeenCalled();

      // PhanQuyen should be created with non-empty permissions
      const allPerms = generateAllPermissions();
      expect(allPerms.length).toBeGreaterThan(0);
      expect(phanQuyenRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vaiTro: 'Admin',
          tenantId: TENANT_ID,
          isActive: true,
          permissions: allPerms,
        }),
      );
      expect(phanQuyenRepo.save).toHaveBeenCalled();

      // AppUserRole should be created for this user
      expect(appUserRoleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          tenantId: TENANT_ID,
          role: 'Admin',
          isActive: true,
        }),
      );
      expect(appUserRoleRepo.save).toHaveBeenCalled();
    });
  });

  describe('(4) isCompanyAdmin=true, PhanQuyen exists with empty permissions → update', () => {
    it('calls phanQuyenRepo.save with generateAllPermissions when permissions is empty', async () => {
      const appConfigRepo = stubRepo();
      appConfigRepo.findOne.mockResolvedValue({ tenantId: TENANT_ID, modules: ['KE_TOAN'] });

      const vaiTroRepo = stubRepo();
      vaiTroRepo.findOne.mockResolvedValue({ ten: 'Admin', isActive: true });

      const phanQuyenRepo = stubRepo();
      const existingPhanQuyen = { vaiTro: 'Admin', tenantId: TENANT_ID, permissions: [] };
      phanQuyenRepo.findOne.mockResolvedValue(existingPhanQuyen);

      const appUserRoleRepo = stubRepo();
      appUserRoleRepo.findOne.mockResolvedValue({ userId: USER_ID, tenantId: TENANT_ID, role: 'Admin', isActive: true });

      const { service } = await buildService({
        [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
        [`${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`]: vaiTroRepo,
        [`${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`]: phanQuyenRepo,
        [getRepositoryToken(AppUserRole) as string]: appUserRoleRepo,
      });

      await service.ensure(TENANT_ID, USER_ID, true);

      // PhanQuyen.create should NOT be called (record already exists)
      expect(phanQuyenRepo.create).not.toHaveBeenCalled();

      // phanQuyenRepo.save should be called with full permissions (update path)
      const allPerms = generateAllPermissions();
      expect(allPerms.length).toBeGreaterThan(0);
      expect(phanQuyenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ permissions: allPerms }),
      );
    });
  });
});
