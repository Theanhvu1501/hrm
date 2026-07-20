import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { AppUserRole, TenantAppConfig } from '@app/entities';
import { IdentityClient } from '@app/service-client';
import { TenantService } from './tenant.service';

const TOKEN = 'Bearer test-token';
const TENANT_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f1f77bcf86cd799439022';

// ─── Stub helpers ────────────────────────────────────────────────────────────

function stubRepo() {
  return {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    create: jest.fn((x: any) => ({ ...x })),
    save: jest.fn(async (x: any) => x),
    remove: jest.fn(async () => undefined),
    count: jest.fn(async () => 0),
  };
}

function stubIdentityClient() {
  return {
    listTenants: jest.fn(async () => ({ success: true, data: [] })),
    createTenant: jest.fn(async () => ({ success: true, data: {} })),
    updateTenant: jest.fn(async () => ({ success: true, data: {} })),
    deleteTenant: jest.fn(async () => ({ success: true, data: {} })),
    listMembers: jest.fn(async () => ({ success: true, data: [] })),
    addMember: jest.fn(async () => ({ success: true, data: {} })),
    updateMember: jest.fn(async () => ({ success: true, data: {} })),
    removeMember: jest.fn(async () => ({ success: true, data: {} })),
    listUsers: jest.fn(async () => ({ success: true, data: [] })),
    createUser: jest.fn(async () => ({ success: true, data: {} })),
    updateUser: jest.fn(async () => ({ success: true, data: {} })),
    resetPassword: jest.fn(async () => ({ success: true, data: { defaultPassword: '123456' } })),
  };
}

async function buildModule(overrides: {
  identityClient?: any;
  [key: string]: any;
} = {}) {
  const identityClient = overrides.identityClient ?? stubIdentityClient();

  const stringOverrides: Record<string, any> = { ...overrides };
  delete stringOverrides.identityClient;

  const stringDefaults: Record<string, any> = {
    [`${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`]: stubRepo(),
    [`${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`]: stubRepo(),
    [getRepositoryToken(AppUserRole) as string]: stubRepo(),
    [getRepositoryToken(TenantAppConfig) as string]: stubRepo(),
  };
  const repos = { ...stringDefaults, ...stringOverrides };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      TenantService,
      { provide: IdentityClient, useValue: identityClient },
      ...Object.entries(repos).map(([token, value]) => ({
        provide: token,
        useValue: value,
      })),
    ],
  }).compile();

  return {
    module,
    service: module.get<TenantService>(TenantService),
    identityClient,
    repos,
  };
}

// ─── findAll ─────────────────────────────────────────────────────────────────

describe('TenantService.findAll', () => {
  it('trả danh sách tenant với modules từ TenantAppConfig', async () => {
    const fakeTenant: any = {
      id: TENANT_ID,
      name: 'Công ty A',
      slug: 'cong-ty-a',
      isActive: true,
      admins: [],
    };
    const fakeConfig: any = { tenantId: TENANT_ID, modules: ['KE_TOAN', 'KHO'] };

    const identityClient = stubIdentityClient();
    identityClient.listTenants.mockResolvedValue({ success: true, data: [fakeTenant] });

    const appConfigRepo = stubRepo();
    appConfigRepo.findOne.mockResolvedValue(fakeConfig);

    const { service } = await buildModule({
      identityClient,
      [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
    });

    const result = await service.findAll(TOKEN);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(TENANT_ID);
    expect(result[0]._id).toBe(TENANT_ID);
    expect(result[0].modules).toEqual(['KE_TOAN', 'KHO']);
    expect(result[0].admins).toEqual([]);
  });

  it('ném lỗi khi listTenants thất bại', async () => {
    const identityClient = stubIdentityClient();
    identityClient.listTenants.mockResolvedValue({
      success: false,
      error: { code: 'INTERNAL', message: 'Lỗi kết nối' },
    });

    const { service } = await buildModule({ identityClient });

    await expect(service.findAll(TOKEN)).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

// ─── findOne ─────────────────────────────────────────────────────────────────

describe('TenantService.findOne', () => {
  it('trả tenant với config đầy đủ', async () => {
    const fakeTenant: any = {
      id: TENANT_ID,
      name: 'Công ty A',
      slug: 'cong-ty-a',
      isActive: true,
      admins: [],
    };
    const fakeConfig: any = {
      tenantId: TENANT_ID,
      modules: ['KE_TOAN'],
      nganh: null,
      glossary: { chuDauTu: { label: 'Nhà đầu tư' } },
      dashboardBlocks: ['kqkd'],
    };

    const identityClient = stubIdentityClient();
    identityClient.listTenants.mockResolvedValue({ success: true, data: [fakeTenant] });

    const appConfigRepo = stubRepo();
    appConfigRepo.findOne.mockResolvedValue(fakeConfig);

    const { service } = await buildModule({
      identityClient,
      [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
    });

    const result = await service.findOne(TOKEN, TENANT_ID);

    expect(result.id).toBe(TENANT_ID);
    expect(result.modules).toEqual(['KE_TOAN']);
    expect(result.glossary).toEqual({ chuDauTu: { label: 'Nhà đầu tư' } });
    expect(result.dashboardBlocks).toEqual(['kqkd']);
  });

  it('ném NotFound khi tenant không tồn tại', async () => {
    const identityClient = stubIdentityClient();
    identityClient.listTenants.mockResolvedValue({ success: true, data: [] });

    const { service } = await buildModule({ identityClient });

    await expect(service.findOne(TOKEN, TENANT_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── create ──────────────────────────────────────────────────────────────────

describe('TenantService.create — TenantAppConfig được tạo với config đúng', () => {
  it('tạo TenantAppConfig với glossary rỗng (hrm không có template ngành) và modules mặc định', async () => {
    const fakeTenant: any = {
      id: TENANT_ID,
      name: 'Công ty XD',
      slug: 'cong-ty-xd',
      isActive: true,
      admins: [],
    };

    const identityClient = stubIdentityClient();
    identityClient.createTenant.mockResolvedValue({ success: true, data: fakeTenant });

    const appConfigRepo = stubRepo();

    const { service } = await buildModule({
      identityClient,
      [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
    });

    await service.create(TOKEN, { name: 'Công ty XD', slug: 'cong-ty-xd', nganh: 'XAY_DUNG', adminUserId: 'existing-admin-id' } as any);

    // identity createTenant should NOT include glossary/modules/nganh
    expect(identityClient.createTenant).toHaveBeenCalledWith(
      TOKEN,
      expect.not.objectContaining({ glossary: expect.anything() }),
    );
    expect(identityClient.createTenant).toHaveBeenCalledWith(
      TOKEN,
      expect.not.objectContaining({ modules: expect.anything() }),
    );

    // TenantAppConfig should be created with empty glossary (Nganh cloning removed in hrm)
    expect(appConfigRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        nganh: 'XAY_DUNG',
        modules: ['KE_TOAN'],
        glossary: {},
      }),
    );
  });

  it('ném ConflictException khi identity trả CONFLICT', async () => {
    const identityClient = stubIdentityClient();
    identityClient.createTenant.mockResolvedValue({
      success: false,
      error: { code: 'CONFLICT', message: 'slug exists' },
    });

    const { service } = await buildModule({ identityClient });

    await expect(
      service.create(TOKEN, { name: 'X', slug: 'duplicate-slug', adminUserId: 'some-admin-id' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('ném BadRequestException khi thiếu cả adminUserId lẫn admin.email', async () => {
    const identityClient = stubIdentityClient();

    const { service } = await buildModule({ identityClient });

    await expect(
      service.create(TOKEN, { name: 'Công ty C', slug: 'cong-ty-c' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    // identity should NOT be called when validation fails early
    expect(identityClient.createTenant).not.toHaveBeenCalled();
  });

  it('tạo AppUserRole cho admin khi identity trả admins[]', async () => {
    const adminId = 'admin-user-id';
    const fakeTenant: any = {
      id: TENANT_ID,
      name: 'Công ty B',
      slug: 'cong-ty-b',
      isActive: true,
      admins: [{ id: adminId, email: 'admin@example.com', hoTen: 'Admin' }],
    };

    const identityClient = stubIdentityClient();
    identityClient.createTenant.mockResolvedValue({ success: true, data: fakeTenant });

    const appUserRoleRepo = stubRepo();
    appUserRoleRepo.findOne.mockResolvedValue(null);

    const { service } = await buildModule({
      identityClient,
      [getRepositoryToken(AppUserRole) as string]: appUserRoleRepo,
    });

    await service.create(TOKEN, { name: 'Công ty B', slug: 'cong-ty-b', adminUserId: 'existing-admin-id' } as any);

    expect(appUserRoleRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: adminId, tenantId: TENANT_ID, role: 'Admin', isActive: true }),
    );
    expect(appUserRoleRepo.save).toHaveBeenCalled();
  });
});

// ─── delete ──────────────────────────────────────────────────────────────────

describe('TenantService.delete', () => {
  it('gọi deleteTenant và deactivate AppUserRole', async () => {
    const fakeRole: any = { userId: USER_ID, tenantId: TENANT_ID, isActive: true };

    const identityClient = stubIdentityClient();
    identityClient.deleteTenant.mockResolvedValue({ success: true, data: { deleted: true } });

    const appUserRoleRepo = stubRepo();
    appUserRoleRepo.find.mockResolvedValue([fakeRole]);
    appUserRoleRepo.save.mockImplementation(async (x: any) => x);

    const { service } = await buildModule({
      identityClient,
      [getRepositoryToken(AppUserRole) as string]: appUserRoleRepo,
    });

    await service.delete(TOKEN, TENANT_ID);

    expect(identityClient.deleteTenant).toHaveBeenCalledWith(TOKEN, TENANT_ID);
    expect(fakeRole.isActive).toBe(false);
    expect(appUserRoleRepo.save).toHaveBeenCalled();
  });

  it('ném NotFound khi identity trả NOT_FOUND', async () => {
    const identityClient = stubIdentityClient();
    identityClient.deleteTenant.mockResolvedValue({
      success: false,
      error: { code: 'NOT_FOUND', message: 'not found' },
    });

    const { service } = await buildModule({ identityClient });

    await expect(service.delete(TOKEN, TENANT_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── update ──────────────────────────────────────────────────────────────────

describe('TenantService.update — đổi nganh chỉ cập nhật TenantAppConfig, không clone glossary', () => {
  it('đổi nganh → TenantAppConfig.nganh được cập nhật, glossary giữ nguyên', async () => {
    const fakeTenant: any = {
      id: TENANT_ID, name: 'Công ty A', slug: 'cong-ty-a', isActive: true, admins: [],
    };
    const updatedTenant: any = { ...fakeTenant, nganh: 'XAY_DUNG' };
    const existingConfig: any = { tenantId: TENANT_ID, nganh: 'OLD', modules: ['KE_TOAN'], glossary: {}, dashboardBlocks: null };

    const identityClient = stubIdentityClient();
    // listTenants called twice: once for verify, once if no identity update
    identityClient.listTenants.mockResolvedValue({ success: true, data: [fakeTenant] });
    identityClient.updateTenant.mockResolvedValue({ success: true, data: updatedTenant });

    const appConfigRepo = stubRepo();
    appConfigRepo.findOne.mockResolvedValue(existingConfig);
    appConfigRepo.save.mockImplementation(async (x: any) => x);

    const { service } = await buildModule({
      identityClient,
      [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
    });

    const result = await service.update(TOKEN, TENANT_ID, { nganh: 'XAY_DUNG' } as any);

    // Only nganh in config should be updated, glossary should remain {}
    expect(existingConfig.nganh).toBe('XAY_DUNG');
    expect(result.glossary).toEqual({});
    expect(appConfigRepo.save).toHaveBeenCalled();
  });
});

// ─── updateGlossary ──────────────────────────────────────────────────────────

describe('TenantService.updateGlossary', () => {
  it('ghi glossary mới vào TenantAppConfig, trả tenant với glossary mới', async () => {
    const fakeTenant: any = {
      id: TENANT_ID, name: 'Công ty A', slug: 'cong-ty-a', isActive: true, admins: [],
    };

    const identityClient = stubIdentityClient();
    identityClient.listTenants.mockResolvedValue({ success: true, data: [fakeTenant] });

    const appConfigRepo = stubRepo();
    appConfigRepo.findOne.mockResolvedValue(null); // no existing config → will create
    appConfigRepo.save.mockImplementation(async (x: any) => x);

    const { service } = await buildModule({
      identityClient,
      [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
    });

    const g = { chuDauTu: { label: 'Nhà tài trợ' } };
    const res = await service.updateGlossary(TOKEN, TENANT_ID, g as any);

    expect(appConfigRepo.save).toHaveBeenCalled();
    expect(res.glossary).toEqual(g);
    // identity should NOT be written for glossary update
    expect(identityClient.updateTenant).not.toHaveBeenCalled();
  });

  it('response chứa đủ dienThoai, email, nguoiDaiDien, admins', async () => {
    const fakeTenant: any = {
      id: TENANT_ID,
      name: 'Công ty A',
      slug: 'cong-ty-a',
      isActive: true,
      dienThoai: '0901234567',
      email: 'cty@example.com',
      nguoiDaiDien: 'Nguyễn Văn A',
      admins: [{ id: 'admin-1', email: 'admin@example.com', hoTen: 'Admin' }],
    };

    const identityClient = stubIdentityClient();
    identityClient.listTenants.mockResolvedValue({ success: true, data: [fakeTenant] });

    const appConfigRepo = stubRepo();
    appConfigRepo.findOne.mockResolvedValue(null);
    appConfigRepo.save.mockImplementation(async (x: any) => x);

    const { service } = await buildModule({
      identityClient,
      [getRepositoryToken(TenantAppConfig) as string]: appConfigRepo,
    });

    const res = await service.updateGlossary(TOKEN, TENANT_ID, {} as any);

    expect(res.dienThoai).toBe('0901234567');
    expect(res.email).toBe('cty@example.com');
    expect(res.nguoiDaiDien).toBe('Nguyễn Văn A');
    expect(res.admins).toEqual([{ id: 'admin-1', email: 'admin@example.com', hoTen: 'Admin' }]);
  });
});

// ─── cloneGlossaryFromNganh (hrm: luôn trả {}) ────────────────────────────────

describe('TenantService.cloneGlossaryFromNganh', () => {
  it('luôn trả {} vì hrm không có template glossary theo ngành', async () => {
    const { service } = await buildModule();
    expect(await service.cloneGlossaryFromNganh('XAY_DUNG')).toEqual({});
    expect(await service.cloneGlossaryFromNganh(undefined)).toEqual({});
    expect(await service.cloneGlossaryFromNganh(null)).toEqual({});
  });
});

// ─── getTenantMembers ─────────────────────────────────────────────────────────

describe('TenantService.getTenantMembers', () => {
  it('trả danh sách members với functional role từ AppUserRole', async () => {
    const fakeTenant: any = { id: TENANT_ID, name: 'A', slug: 'a', isActive: true, admins: [] };
    const fakeMember: any = { userId: USER_ID, hoTen: 'Test User', email: 'test@example.com', role: 'member', isActive: true };
    const fakeAppRole: any = { userId: USER_ID, tenantId: TENANT_ID, role: 'KIEM_SOAT', isActive: true };

    const identityClient = stubIdentityClient();
    identityClient.listTenants.mockResolvedValue({ success: true, data: [fakeTenant] });
    identityClient.listMembers.mockResolvedValue({ success: true, data: [fakeMember] });

    const appUserRoleRepo = stubRepo();
    appUserRoleRepo.find.mockResolvedValue([fakeAppRole]);

    const { service } = await buildModule({
      identityClient,
      [getRepositoryToken(AppUserRole) as string]: appUserRoleRepo,
    });

    const result = await service.getTenantMembers(TOKEN, TENANT_ID);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(USER_ID);
    expect(result[0].role).toBe('KIEM_SOAT'); // functional role from AppUserRole
  });
});

// ─── addUserToTenant ─────────────────────────────────────────────────────────

describe('TenantService.addUserToTenant', () => {
  it('thêm user theo userId và tạo AppUserRole', async () => {
    const fakeTenant: any = { id: TENANT_ID, name: 'A', slug: 'a', isActive: true, admins: [] };
    const fakeMemberData: any = { userId: USER_ID, hoTen: 'Test', email: 'test@example.com', role: 'member', isActive: true };

    const identityClient = stubIdentityClient();
    identityClient.listTenants.mockResolvedValue({ success: true, data: [fakeTenant] });
    identityClient.addMember.mockResolvedValue({ success: true, data: fakeMemberData });

    const appUserRoleRepo = stubRepo();
    appUserRoleRepo.findOne.mockResolvedValue(null);

    const { service } = await buildModule({
      identityClient,
      [getRepositoryToken(AppUserRole) as string]: appUserRoleRepo,
    });

    const result = await service.addUserToTenant(TOKEN, TENANT_ID, {
      userId: USER_ID,
      role: 'KIEM_SOAT',
    } as any);

    expect(identityClient.addMember).toHaveBeenCalledWith(TOKEN, TENANT_ID, { userId: USER_ID, role: 'member' });
    expect(appUserRoleRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, tenantId: TENANT_ID, role: 'KIEM_SOAT' }),
    );
    expect(result.role).toBe('KIEM_SOAT');
    expect(result.isNew).toBe(false);
  });

  it('ném Conflict khi identity trả CONFLICT', async () => {
    const fakeTenant: any = { id: TENANT_ID, name: 'A', slug: 'a', isActive: true, admins: [] };
    const identityClient = stubIdentityClient();
    identityClient.listTenants.mockResolvedValue({ success: true, data: [fakeTenant] });
    identityClient.addMember.mockResolvedValue({
      success: false,
      error: { code: 'CONFLICT', message: 'already member' },
    });

    const { service } = await buildModule({ identityClient });

    await expect(
      service.addUserToTenant(TOKEN, TENANT_ID, { userId: USER_ID, role: 'KIEM_SOAT' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

// ─── removeTenantMember ───────────────────────────────────────────────────────

describe('TenantService.removeTenantMember', () => {
  it('gọi removeMember và deactivate AppUserRole', async () => {
    const fakeRole: any = { userId: USER_ID, tenantId: TENANT_ID, isActive: true };

    const identityClient = stubIdentityClient();
    identityClient.removeMember.mockResolvedValue({ success: true, data: { deleted: true } });

    const appUserRoleRepo = stubRepo();
    appUserRoleRepo.findOne.mockResolvedValue(fakeRole);
    appUserRoleRepo.save.mockImplementation(async (x: any) => x);

    const { service } = await buildModule({
      identityClient,
      [getRepositoryToken(AppUserRole) as string]: appUserRoleRepo,
    });

    await service.removeTenantMember(TOKEN, TENANT_ID, USER_ID);

    expect(identityClient.removeMember).toHaveBeenCalledWith(TOKEN, TENANT_ID, USER_ID);
    expect(fakeRole.isActive).toBe(false);
    expect(appUserRoleRepo.save).toHaveBeenCalled();
  });

  it('ném NotFound khi removeMember trả NOT_FOUND', async () => {
    const identityClient = stubIdentityClient();
    identityClient.removeMember.mockResolvedValue({
      success: false,
      error: { code: 'NOT_FOUND', message: 'not found' },
    });

    const { service } = await buildModule({ identityClient });

    await expect(service.removeTenantMember(TOKEN, TENANT_ID, USER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

// ─── updateMemberProfile ──────────────────────────────────────────────────────

describe('TenantService.updateMemberProfile', () => {
  it('cập nhật hoTen và email (lowercase) qua identity', async () => {
    const fakeMember: any = {
      userId: USER_ID, hoTen: 'Old Name', email: 'old@example.com', role: 'member', isActive: true,
    };
    const identityClient = stubIdentityClient();
    identityClient.listMembers.mockResolvedValue({ success: true, data: [fakeMember] });
    identityClient.updateUser.mockResolvedValue({
      success: true,
      data: { id: USER_ID, email: 'new@example.com', hoTen: 'New Name' },
    });

    const { service } = await buildModule({ identityClient });

    const result = await service.updateMemberProfile(TOKEN, TENANT_ID, USER_ID, {
      hoTen: 'New Name',
      email: 'NEW@Example.com',
    });

    expect(identityClient.updateUser).toHaveBeenCalledWith(TOKEN, USER_ID, {
      hoTen: 'New Name',
      email: 'new@example.com',
    });
    expect(result).toEqual({ id: USER_ID, email: 'new@example.com', hoTen: 'New Name' });
  });

  it('ném NotFound khi không phải thành viên của tenant', async () => {
    const identityClient = stubIdentityClient();
    identityClient.listMembers.mockResolvedValue({ success: true, data: [] });

    const { service } = await buildModule({ identityClient });

    await expect(
      service.updateMemberProfile(TOKEN, TENANT_ID, USER_ID, { hoTen: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ném Conflict khi identity updateUser trả CONFLICT (email đã dùng)', async () => {
    const fakeMember: any = {
      userId: USER_ID, hoTen: 'Name', email: 'old@example.com', role: 'member', isActive: true,
    };
    const identityClient = stubIdentityClient();
    identityClient.listMembers.mockResolvedValue({ success: true, data: [fakeMember] });
    identityClient.updateUser.mockResolvedValue({
      success: false,
      error: { code: 'CONFLICT', message: 'Email đã được sử dụng' },
    });

    const { service } = await buildModule({ identityClient });

    await expect(
      service.updateMemberProfile(TOKEN, TENANT_ID, USER_ID, { email: 'taken@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

// ─── resetMemberPassword ──────────────────────────────────────────────────────

describe('TenantService.resetMemberPassword', () => {
  it('reset password qua identity và trả defaultPassword', async () => {
    const fakeMember: any = {
      userId: USER_ID, hoTen: 'Name', email: 'test@example.com', role: 'member', isActive: true,
    };
    const identityClient = stubIdentityClient();
    identityClient.listMembers.mockResolvedValue({ success: true, data: [fakeMember] });
    identityClient.resetPassword.mockResolvedValue({
      success: true,
      data: { defaultPassword: '123456' },
    });

    const { service } = await buildModule({ identityClient });

    const result = await service.resetMemberPassword(TOKEN, TENANT_ID, USER_ID);

    expect(identityClient.resetPassword).toHaveBeenCalledWith(TOKEN, USER_ID, {});
    expect(result).toEqual({ defaultPassword: '123456' });
  });

  it('ném NotFound khi không phải thành viên của tenant', async () => {
    const identityClient = stubIdentityClient();
    identityClient.listMembers.mockResolvedValue({ success: true, data: [] });

    const { service } = await buildModule({ identityClient });

    await expect(service.resetMemberPassword(TOKEN, TENANT_ID, USER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

// ─── throwFromServiceError FORBIDDEN propagation ──────────────────────────────

describe('TenantService — throwFromServiceError FORBIDDEN', () => {
  it('throws ForbiddenException when identity returns FORBIDDEN', async () => {
    const identityClient = stubIdentityClient();
    identityClient.listTenants.mockResolvedValue({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Không có quyền' },
    });

    const { service } = await buildModule({ identityClient });

    await expect(service.findAll(TOKEN)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

// ─── ServiceResponse error handling ──────────────────────────────────────────

describe('TenantService — ServiceResponse error handling', () => {
  it('throwFromServiceError ném NotFoundException cho NOT_FOUND', async () => {
    const identityClient = stubIdentityClient();
    identityClient.listTenants.mockResolvedValue({
      success: false,
      error: { code: 'NOT_FOUND', message: 'nope' },
    });

    const { service } = await buildModule({ identityClient });

    await expect(service.findAll(TOKEN)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throwFromServiceError ném ConflictException cho CONFLICT', async () => {
    const identityClient = stubIdentityClient();
    identityClient.listTenants.mockResolvedValue({ success: true, data: [{ id: TENANT_ID, name: 'X', slug: 'x', isActive: true, admins: [] }] });
    identityClient.updateTenant.mockResolvedValue({
      success: false,
      error: { code: 'CONFLICT', message: 'slug exists' },
    });

    const { service } = await buildModule({ identityClient });

    await expect(service.update(TOKEN, TENANT_ID, { slug: 'taken' } as any)).rejects.toBeInstanceOf(ConflictException);
  });
});
