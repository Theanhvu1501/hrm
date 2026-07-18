import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { NguoiDung_Service, PaginatedResult, UserWithTenant } from './nguoi-dung.service';
import { AppUserRole, UserStatus } from '@app/entities';
import { TenantContextService } from '@app/core';
import { IdentityClient } from '@app/service-client';

const TOKEN = 'Bearer test-token';
const TENANT_ID = 'test-tenant-id';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const makeIdentityUser = (
  overrides: Partial<{
    id: string;
    hoTen: string;
    email: string;
    trangThai: UserStatus;
    isActive: boolean;
    tenants: { id: string; name: string; role: string }[];
  }> = {},
) => ({
  id: 'user-id-1',
  hoTen: 'Nguyen Van A',
  email: 'vana@example.com',
  trangThai: UserStatus.HOAT_DONG,
  isActive: true,
  tenants: [{ id: TENANT_ID, name: 'Test Company', role: 'member' }],
  ...overrides,
});

const makeAppUserRole = (
  userId = 'user-id-1',
  role = 'KE_TOAN_TRUONG',
): Partial<AppUserRole> => ({
  userId,
  tenantId: TENANT_ID,
  role,
  isActive: true,
});

// ──────────────────────────────────────────────────────────────────────────────
// Main describe
// ──────────────────────────────────────────────────────────────────────────────
describe('NguoiDung_Service (IdentityClient refactor)', () => {
  let service: NguoiDung_Service;
  let mockIdentityClient: jest.Mocked<
    Pick<
      IdentityClient,
      | 'listUsers'
      | 'createUser'
      | 'updateUser'
      | 'toggleUserStatus'
      | 'addMember'
      | 'resetPassword'
      | 'deleteUser'
    >
  >;
  let mockAppUserRoleRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockTenantContext: {
    getCurrentTenantId: jest.Mock;
    isSuperAdmin: jest.Mock;
  };

  beforeEach(async () => {
    mockIdentityClient = {
      listUsers: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      toggleUserStatus: jest.fn(),
      addMember: jest.fn(),
      resetPassword: jest.fn(),
      deleteUser: jest.fn(),
    };

    mockAppUserRoleRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve(v)),
    };

    mockTenantContext = {
      getCurrentTenantId: jest.fn().mockReturnValue(TENANT_ID),
      isSuperAdmin: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NguoiDung_Service,
        { provide: IdentityClient, useValue: mockIdentityClient },
        {
          provide: getRepositoryToken(AppUserRole),
          useValue: mockAppUserRoleRepo,
        },
        { provide: TenantContextService, useValue: mockTenantContext },
      ],
    }).compile();

    service = module.get<NguoiDung_Service>(NguoiDung_Service);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // findAll
  // ──────────────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('returns paginated UserWithTenant list with tenantRole from AppUserRole', async () => {
      const user = makeIdentityUser();
      mockIdentityClient.listUsers.mockResolvedValue({
        success: true,
        data: [user],
      });
      mockAppUserRoleRepo.find.mockResolvedValue([makeAppUserRole(user.id, 'KE_TOAN_TRUONG')]);

      const result = await service.findAll(TOKEN, { page: 1, limit: 10 });

      expect(result.total).toBe(1);
      expect(result.data[0].tenantRole).toBe('KE_TOAN_TRUONG');
      expect(result.data[0].email).toBe(user.email);
    });

    it('defaults tenantRole to KIEM_SOAT when no AppUserRole row exists', async () => {
      const user = makeIdentityUser();
      mockIdentityClient.listUsers.mockResolvedValue({ success: true, data: [user] });
      mockAppUserRoleRepo.find.mockResolvedValue([]);

      const result = await service.findAll(TOKEN, { page: 1, limit: 10 });

      expect(result.data[0].tenantRole).toBe('KIEM_SOAT');
    });

    it('filters by vaiTro using AppUserRole', async () => {
      const userA = makeIdentityUser({ id: 'a', email: 'a@x.com' });
      const userB = makeIdentityUser({ id: 'b', email: 'b@x.com' });
      mockIdentityClient.listUsers.mockResolvedValue({ success: true, data: [userA, userB] });
      // Only userA has KE_TOAN_TRUONG; userB has no row (defaults to KIEM_SOAT)
      mockAppUserRoleRepo.find.mockResolvedValue([makeAppUserRole('a', 'KE_TOAN_TRUONG')]);

      const result = await service.findAll(TOKEN, { page: 1, limit: 10, vaiTro: 'KE_TOAN_TRUONG' });

      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe('a');
    });

    it('filters by trangThai client-side', async () => {
      const active = makeIdentityUser({ id: 'act', trangThai: UserStatus.HOAT_DONG });
      const locked = makeIdentityUser({ id: 'lck', email: 'b@x.com', trangThai: UserStatus.KHOA });
      mockIdentityClient.listUsers.mockResolvedValue({ success: true, data: [active, locked] });
      mockAppUserRoleRepo.find.mockResolvedValue([]);

      const result = await service.findAll(TOKEN, {
        page: 1,
        limit: 10,
        trangThai: UserStatus.KHOA,
      });

      expect(result.total).toBe(1);
      expect(result.data[0].trangThai).toBe(UserStatus.KHOA);
    });

    it('returns paginated result with correct totalPages math', async () => {
      const users = Array.from({ length: 15 }, (_, i) =>
        makeIdentityUser({ id: `u${i}`, email: `u${i}@x.com` }),
      );
      mockIdentityClient.listUsers.mockResolvedValue({ success: true, data: users });
      mockAppUserRoleRepo.find.mockResolvedValue([]);

      const result = await service.findAll(TOKEN, { page: 2, limit: 5 });

      expect(result.total).toBe(15);
      expect(result.totalPages).toBe(3);
      expect(result.data.length).toBe(5);
    });

    it('returns empty when identity returns no users', async () => {
      mockIdentityClient.listUsers.mockResolvedValue({ success: true, data: [] });

      const result = await service.findAll(TOKEN, { page: 1, limit: 10 });

      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });

    it('throws InternalServerErrorException when identity returns success:false', async () => {
      mockIdentityClient.listUsers.mockResolvedValue({
        success: false,
        error: { code: 'INTERNAL', message: 'identity down' },
      });

      await expect(service.findAll(TOKEN, { page: 1, limit: 10 })).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('passes tenantId to identity listUsers', async () => {
      mockIdentityClient.listUsers.mockResolvedValue({ success: true, data: [] });

      await service.findAll(TOKEN, { page: 1, limit: 10 });

      expect(mockIdentityClient.listUsers).toHaveBeenCalledWith(TOKEN, expect.objectContaining({ tenantId: TENANT_ID }));
    });

    it('passes search to identity listUsers', async () => {
      mockIdentityClient.listUsers.mockResolvedValue({ success: true, data: [] });

      await service.findAll(TOKEN, { page: 1, limit: 10, search: 'Nguyen' });

      expect(mockIdentityClient.listUsers).toHaveBeenCalledWith(TOKEN, expect.objectContaining({ search: 'Nguyen' }));
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // findOne
  // ──────────────────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('returns UserWithTenant for existing user', async () => {
      const user = makeIdentityUser({ id: 'user-id-1' });
      mockIdentityClient.listUsers.mockResolvedValue({ success: true, data: [user] });
      mockAppUserRoleRepo.findOne.mockResolvedValue(makeAppUserRole('user-id-1', 'GIAM_DOC'));

      const result = await service.findOne(TOKEN, 'user-id-1');

      expect(result.id).toBe('user-id-1');
      expect(result.tenantRole).toBe('GIAM_DOC');
    });

    it('throws NotFoundException when user not in list', async () => {
      mockIdentityClient.listUsers.mockResolvedValue({ success: true, data: [] });

      await expect(service.findOne(TOKEN, 'missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // findByEmail
  // ──────────────────────────────────────────────────────────────────────────
  describe('findByEmail', () => {
    it('returns user when email matches', async () => {
      const user = makeIdentityUser({ email: 'find@test.com' });
      mockIdentityClient.listUsers.mockResolvedValue({ success: true, data: [user] });

      const result = await service.findByEmail(TOKEN, 'find@test.com');

      expect(result).not.toBeNull();
      expect(result!.email).toBe('find@test.com');
    });

    it('returns null when no email match', async () => {
      mockIdentityClient.listUsers.mockResolvedValue({
        success: true,
        data: [makeIdentityUser({ email: 'other@test.com' })],
      });

      const result = await service.findByEmail(TOKEN, 'notfound@test.com');

      expect(result).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto = {
      email: 'new@test.com',
      hoTen: 'New User',
      vaiTro: 'KE_TOAN_TRUONG',
    };

    it('calls createUser then creates AppUserRole', async () => {
      const identityUser = makeIdentityUser({ id: 'new-id', email: dto.email, hoTen: dto.hoTen });
      mockIdentityClient.createUser.mockResolvedValue({ success: true, data: identityUser });

      const result = await service.create(TOKEN, dto as any);

      expect(mockIdentityClient.createUser).toHaveBeenCalledWith(TOKEN, expect.objectContaining({
        email: 'new@test.com',
        hoTen: 'New User',
        role: 'member',
        tenantId: TENANT_ID,
      }));
      expect(mockAppUserRoleRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'new-id',
        tenantId: TENANT_ID,
        role: 'KE_TOAN_TRUONG',
      }));
      expect(mockAppUserRoleRepo.save).toHaveBeenCalled();
      expect(result.id).toBe('new-id');
    });

    it('throws ConflictException when identity returns CONFLICT error', async () => {
      mockIdentityClient.createUser.mockResolvedValue({
        success: false,
        error: { code: 'CONFLICT', message: 'Email đã được sử dụng' },
      });

      await expect(service.create(TOKEN, dto as any)).rejects.toThrow(ConflictException);
    });

    it('throws InternalServerErrorException on generic identity error', async () => {
      mockIdentityClient.createUser.mockResolvedValue({
        success: false,
        error: { code: 'INTERNAL', message: 'server error' },
      });

      await expect(service.create(TOKEN, dto as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // update
  // ──────────────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('calls updateUser and updates AppUserRole when vaiTro provided', async () => {
      const updated = makeIdentityUser({ id: 'u1', hoTen: 'Updated' });
      mockIdentityClient.updateUser.mockResolvedValue({ success: true, data: updated });
      const existingRole = makeAppUserRole('u1', 'KIEM_SOAT');
      mockAppUserRoleRepo.findOne.mockResolvedValue(existingRole);

      const result = await service.update(TOKEN, 'u1', { hoTen: 'Updated', vaiTro: 'GIAM_DOC' } as any);

      expect(mockIdentityClient.updateUser).toHaveBeenCalledWith(TOKEN, 'u1', expect.objectContaining({ hoTen: 'Updated' }));
      expect(mockAppUserRoleRepo.save).toHaveBeenCalledWith(expect.objectContaining({ role: 'GIAM_DOC' }));
      expect(result.tenantRole).toBe('GIAM_DOC');
    });

    it('creates new AppUserRole when none exists yet', async () => {
      mockIdentityClient.updateUser.mockResolvedValue({
        success: true,
        data: makeIdentityUser({ id: 'u2' }),
      });
      mockAppUserRoleRepo.findOne.mockResolvedValue(null);

      await service.update(TOKEN, 'u2', { vaiTro: 'KE_TOAN_QUY' } as any);

      expect(mockAppUserRoleRepo.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'KE_TOAN_QUY' }));
    });

    it('throws NotFoundException when identity returns NOT_FOUND', async () => {
      mockIdentityClient.updateUser.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Người dùng không tồn tại' },
      });

      await expect(service.update(TOKEN, 'bad-id', {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // delete
  // ──────────────────────────────────────────────────────────────────────────
  describe('delete', () => {
    it('calls identityClient.deleteUser and soft-deletes AppUserRole rows in digital_book', async () => {
      mockIdentityClient.deleteUser.mockResolvedValue({ success: true, data: {} });
      const roles = [
        { ...makeAppUserRole('u1', 'KIEM_SOAT'), isActive: true },
      ] as AppUserRole[];
      mockAppUserRoleRepo.find.mockResolvedValue(roles);

      await service.delete(TOKEN, 'u1');

      expect(mockIdentityClient.deleteUser).toHaveBeenCalledWith(TOKEN, 'u1');
      expect(mockAppUserRoleRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    });

    it('does not throw even when no AppUserRole rows exist', async () => {
      mockIdentityClient.deleteUser.mockResolvedValue({ success: true, data: {} });
      mockAppUserRoleRepo.find.mockResolvedValue([]);

      await expect(service.delete(TOKEN, 'u1')).resolves.toBeUndefined();
    });

    it('throws NotFoundException when identity returns NOT_FOUND', async () => {
      mockIdentityClient.deleteUser.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Người dùng không tồn tại' },
      });

      await expect(service.delete(TOKEN, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws InternalServerErrorException when identity returns generic error', async () => {
      mockIdentityClient.deleteUser.mockResolvedValue({
        success: false,
        error: { code: 'INTERNAL', message: 'identity down' },
      });

      await expect(service.delete(TOKEN, 'u1')).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // toggleStatus
  // ──────────────────────────────────────────────────────────────────────────
  describe('toggleStatus', () => {
    it('calls toggleUserStatus and returns UserWithTenant', async () => {
      const toggled = makeIdentityUser({ id: 'u1', trangThai: UserStatus.KHOA, isActive: false });
      mockIdentityClient.toggleUserStatus.mockResolvedValue({ success: true, data: toggled });

      const result = await service.toggleStatus(TOKEN, 'u1');

      expect(mockIdentityClient.toggleUserStatus).toHaveBeenCalledWith(TOKEN, 'u1');
      expect(result.trangThai).toBe(UserStatus.KHOA);
    });

    it('throws NotFoundException when identity returns NOT_FOUND', async () => {
      mockIdentityClient.toggleUserStatus.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'not found' },
      });

      await expect(service.toggleStatus(TOKEN, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // addExistingUser
  // ──────────────────────────────────────────────────────────────────────────
  describe('addExistingUser', () => {
    const dto = { userId: 'existing-user-id', vaiTro: 'KE_TOAN_CONG_NO' };

    it('calls addMember and creates AppUserRole', async () => {
      mockIdentityClient.addMember.mockResolvedValue({
        success: true,
        data: {
          userId: dto.userId,
          hoTen: 'Existing User',
          email: 'exist@test.com',
          role: 'member',
          isActive: true,
        },
      });
      mockAppUserRoleRepo.findOne.mockResolvedValue(null);

      const result = await service.addExistingUser(TOKEN, dto as any);

      expect(mockIdentityClient.addMember).toHaveBeenCalledWith(TOKEN, TENANT_ID, {
        userId: dto.userId,
        role: 'member',
      });
      expect(mockAppUserRoleRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: dto.userId,
        role: dto.vaiTro,
      }));
      expect(result.tenantRole).toBe(dto.vaiTro);
    });

    it('updates existing AppUserRole on re-add', async () => {
      mockIdentityClient.addMember.mockResolvedValue({
        success: true,
        data: { userId: dto.userId, hoTen: 'User', email: 'u@x.com', role: 'member', isActive: true },
      });
      const existingRole = { ...makeAppUserRole(dto.userId, 'KIEM_SOAT'), isActive: false } as AppUserRole;
      mockAppUserRoleRepo.findOne.mockResolvedValue(existingRole);

      await service.addExistingUser(TOKEN, dto as any);

      expect(mockAppUserRoleRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        role: dto.vaiTro,
        isActive: true,
      }));
    });

    it('throws NotFoundException when identity says user not found', async () => {
      mockIdentityClient.addMember.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Người dùng không tồn tại' },
      });

      await expect(service.addExistingUser(TOKEN, dto as any)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when already a member', async () => {
      mockIdentityClient.addMember.mockResolvedValue({
        success: false,
        error: { code: 'CONFLICT', message: 'Người dùng đã là thành viên' },
      });

      await expect(service.addExistingUser(TOKEN, dto as any)).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when tenant context is missing', async () => {
      mockTenantContext.getCurrentTenantId.mockReturnValue(null);

      await expect(service.addExistingUser(TOKEN, dto as any)).rejects.toThrow(ConflictException);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // searchUsersNotInTenant
  // ──────────────────────────────────────────────────────────────────────────
  describe('searchUsersNotInTenant', () => {
    it('excludes users already in current tenant', async () => {
      const inTenant = makeIdentityUser({
        id: 'in',
        tenants: [{ id: TENANT_ID, name: 'Test Company', role: 'member' }],
      });
      const notInTenant = makeIdentityUser({
        id: 'out',
        email: 'out@x.com',
        tenants: [{ id: 'other-tenant', name: 'Other', role: 'member' }],
      });
      mockIdentityClient.listUsers.mockResolvedValue({
        success: true,
        data: [inTenant, notInTenant],
      });

      const result = await service.searchUsersNotInTenant(TOKEN, undefined);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('out');
    });

    it('returns empty array when no tenant context', async () => {
      mockTenantContext.getCurrentTenantId.mockReturnValue(null);

      const result = await service.searchUsersNotInTenant(TOKEN, undefined);

      expect(result).toHaveLength(0);
      expect(mockIdentityClient.listUsers).not.toHaveBeenCalled();
    });

    it('throws on identity error', async () => {
      mockIdentityClient.listUsers.mockResolvedValue({
        success: false,
        error: { code: 'INTERNAL', message: 'error' },
      });

      await expect(service.searchUsersNotInTenant(TOKEN, undefined)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // throwFromServiceError — FORBIDDEN propagation
  // ──────────────────────────────────────────────────────────────────────────
  describe('throwFromServiceError — FORBIDDEN', () => {
    it('throws ForbiddenException when identity returns FORBIDDEN', async () => {
      mockIdentityClient.listUsers.mockResolvedValue({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Không có quyền' },
      });

      await expect(service.findAll(TOKEN, { page: 1, limit: 10 })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getStats
  // ──────────────────────────────────────────────────────────────────────────
  describe('getStats', () => {
    it('returns correct counts from identity + appUserRoleRepo', async () => {
      const users = [
        makeIdentityUser({ id: 'a', trangThai: UserStatus.HOAT_DONG }),
        makeIdentityUser({ id: 'b', email: 'b@x.com', trangThai: UserStatus.KHOA }),
        makeIdentityUser({ id: 'c', email: 'c@x.com', trangThai: UserStatus.HOAT_DONG }),
      ];
      mockIdentityClient.listUsers.mockResolvedValue({ success: true, data: users });
      mockAppUserRoleRepo.find.mockResolvedValue([
        makeAppUserRole('a', 'GIAM_DOC'),
        makeAppUserRole('b', 'KIEM_SOAT'),
        makeAppUserRole('c', 'GIAM_DOC'),
      ]);

      const stats = await service.getStats(TOKEN);

      expect(stats.tongNguoiDung).toBe(3);
      expect(stats.dangHoatDong).toBe(2);
      expect(stats.daKhoa).toBe(1);
      expect(stats.theoVaiTro).toEqual({ GIAM_DOC: 2, KIEM_SOAT: 1 });
    });

    it('returns zero stats when no users', async () => {
      mockIdentityClient.listUsers.mockResolvedValue({ success: true, data: [] });

      const stats = await service.getStats(TOKEN);

      expect(stats).toEqual({ tongNguoiDung: 0, dangHoatDong: 0, daKhoa: 0, theoVaiTro: {} });
    });
  });
});
