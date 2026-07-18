import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppUserRole, UserStatus, SUPER_ADMIN_EMAIL } from '@app/entities';
import { TenantContextService } from '@app/core';
import { IdentityClient } from '@app/service-client';
import {
  CreateNguoiDungDto,
  UpdateNguoiDungDto,
  PaginationQueryDto,
  AddExistingUserDto,
} from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NguoiDungStats {
  tongNguoiDung: number;
  dangHoatDong: number;
  daKhoa: number;
  theoVaiTro: Record<string, number>;
}

// Extended user with tenant info — shape kept identical to original for FE compatibility
export interface UserWithTenant {
  _id: string;
  id: string;
  email: string;
  hoTen: string;
  trangThai: UserStatus;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  tenantRole?: string;
}

// Shape of each user object returned by identity listUsers
interface IdentityUser {
  id: string;
  hoTen: string;
  email: string;
  trangThai: UserStatus;
  isActive: boolean;
  tenants?: { id: string; name: string; role: string }[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

@Injectable()
export class NguoiDung_Service {
  constructor(
    // Default connection (digital_book) — functional accounting role
    @InjectRepository(AppUserRole)
    private readonly appUserRoleRepo: Repository<AppUserRole>,
    private readonly tenantContext: TenantContextService,
    private readonly identityClient: IdentityClient,
  ) {}

  // ─── Error handling ────────────────────────────────────────────────────────

  private throwFromServiceError(
    res: { success: boolean; error?: { code?: string; message?: string } },
    notFoundMessage?: string,
  ): never {
    const { code, message } = res.error ?? {};
    if (code === 'NOT_FOUND') {
      throw new NotFoundException(notFoundMessage ?? message ?? 'Không tìm thấy');
    }
    if (code === 'CONFLICT') {
      throw new ConflictException(message ?? 'Xung đột dữ liệu');
    }
    if (code === 'FORBIDDEN') throw new ForbiddenException(message ?? 'Không có quyền');
    if (code === 'UNAUTHORIZED') throw new UnauthorizedException(message ?? 'Chưa xác thực');
    throw new InternalServerErrorException(message ?? 'Lỗi từ identity service');
  }

  // ─── Map identity user to UserWithTenant shape ─────────────────────────────

  private mapToUserWithTenant(
    user: IdentityUser,
    tenantRole?: string,
  ): UserWithTenant {
    const now = new Date();
    return {
      _id: user.id,
      id: user.id,
      email: user.email,
      hoTen: user.hoTen,
      trangThai: user.trangThai,
      isActive: user.isActive,
      isSuperAdmin: user.email === SUPER_ADMIN_EMAIL,
      createdAt: user.createdAt ? new Date(user.createdAt) : now,
      updatedAt: user.updatedAt ? new Date(user.updatedAt) : now,
      tenantRole: tenantRole ?? 'KIEM_SOAT',
    };
  }

  // ─── findAll ───────────────────────────────────────────────────────────────

  async findAll(
    token: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<UserWithTenant>> {
    const { page = 1, limit = 10, search, vaiTro, trangThai } = query;
    const currentTenantId = this.tenantContext.getCurrentTenantId();

    // Step 1: Get users from identity (search + tenant scoping handled server-side)
    const identityQuery: Record<string, string | undefined> = {};
    if (search) identityQuery.search = search;
    if (currentTenantId) identityQuery.tenantId = currentTenantId;

    const res = await this.identityClient.listUsers(token, identityQuery);
    if (!res.success) this.throwFromServiceError(res);

    const identityUsers: IdentityUser[] = res.data ?? [];
    if (identityUsers.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    // Step 2: Load functional roles from AppUserRole (digital_book)
    const userIds = identityUsers.map((u) => u.id);
    const whereRole: Record<string, any> = {
      userId: { $in: userIds } as any,
      isActive: true,
    };
    if (currentTenantId) {
      whereRole.tenantId = currentTenantId;
    }
    const appUserRoles = await this.appUserRoleRepo.find({ where: whereRole as any });

    // Step 3: Apply vaiTro filter via AppUserRole (functional role)
    // Users with no AppUserRole row default to 'KIEM_SOAT'
    let filteredUsers = identityUsers;
    if (vaiTro) {
      const usersWithMatchingRole = new Set(
        appUserRoles.filter((aur) => aur.role === vaiTro).map((aur) => aur.userId),
      );
      filteredUsers = identityUsers.filter((u) => {
        const hasAnyRoleRow = appUserRoles.some((aur) => aur.userId === u.id);
        if (!hasAnyRoleRow) {
          // Default functional role is 'KIEM_SOAT'
          return vaiTro === 'KIEM_SOAT';
        }
        return usersWithMatchingRole.has(u.id);
      });
    }

    // Step 4: Apply trangThai filter client-side
    if (trangThai) {
      filteredUsers = filteredUsers.filter((u) => u.trangThai === trangThai);
    }

    // Step 5: Map to UserWithTenant with functional role join
    const usersWithTenant: UserWithTenant[] = filteredUsers.map((user) => {
      const appUserRole = appUserRoles.find((aur) => aur.userId === user.id);
      return this.mapToUserWithTenant(user, appUserRole?.role ?? 'KIEM_SOAT');
    });

    // Step 6: Paginate client-side
    const total = usersWithTenant.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const data = usersWithTenant.slice(skip, skip + limit);

    return { data, total, page, limit, totalPages };
  }

  // ─── findOne ───────────────────────────────────────────────────────────────

  async findOne(token: string, id: string): Promise<UserWithTenant> {
    const currentTenantId = this.tenantContext.getCurrentTenantId();
    const query: Record<string, string> = {};
    if (currentTenantId) query.tenantId = currentTenantId;

    const res = await this.identityClient.listUsers(token, query);
    if (!res.success) this.throwFromServiceError(res);

    const user: IdentityUser | undefined = (res.data ?? []).find(
      (u: IdentityUser) => u.id === id,
    );

    if (!user) {
      throw new NotFoundException(`Người dùng với ID ${id} không tồn tại`);
    }

    const appUserRole = await this.appUserRoleRepo.findOne({
      where: {
        userId: id,
        isActive: true,
        ...(currentTenantId ? { tenantId: currentTenantId } : {}),
      } as any,
    });

    return this.mapToUserWithTenant(user, appUserRole?.role ?? 'KIEM_SOAT');
  }

  // ─── findByEmail ───────────────────────────────────────────────────────────

  async findByEmail(token: string, email: string): Promise<UserWithTenant | null> {
    const res = await this.identityClient.listUsers(token, { search: email });
    if (!res.success) this.throwFromServiceError(res);

    const user: IdentityUser | undefined = (res.data ?? []).find(
      (u: IdentityUser) => u.email.toLowerCase() === email.toLowerCase(),
    );

    if (!user) return null;
    return this.mapToUserWithTenant(user);
  }

  // ─── create ────────────────────────────────────────────────────────────────

  async create(token: string, dto: CreateNguoiDungDto): Promise<UserWithTenant> {
    const tenantId = this.tenantContext.getCurrentTenantId();

    const res = await this.identityClient.createUser(token, {
      email: dto.email.toLowerCase(),
      hoTen: dto.hoTen,
      ...(tenantId ? { tenantId } : {}),
      role: 'member', // membership tier (NOT functional role)
      ...(dto.trangThai ? { trangThai: dto.trangThai } : {}),
    });

    if (!res.success) {
      if (res.error?.code === 'CONFLICT') {
        throw new ConflictException('Email đã tồn tại trong hệ thống');
      }
      this.throwFromServiceError(res);
    }

    const created: IdentityUser = res.data;

    // Create functional role in AppUserRole (digital_book) — only when tenant context exists
    if (tenantId) {
      const appUserRole = this.appUserRoleRepo.create({
        userId: created.id,
        tenantId,
        role: dto.vaiTro || 'KIEM_SOAT',
        isActive: true,
      });
      await this.appUserRoleRepo.save(appUserRole);
    }

    return this.mapToUserWithTenant(created, dto.vaiTro || 'KIEM_SOAT');
  }

  // ─── update ────────────────────────────────────────────────────────────────

  async update(token: string, id: string, dto: UpdateNguoiDungDto): Promise<UserWithTenant> {
    // Update identity fields
    const updateBody: Record<string, unknown> = {};
    if (dto.hoTen) updateBody.hoTen = dto.hoTen;
    if (dto.email) updateBody.email = dto.email.toLowerCase();
    if (dto.trangThai) updateBody.trangThai = dto.trangThai;

    const res = await this.identityClient.updateUser(token, id, updateBody);
    if (!res.success) {
      if (res.error?.code === 'NOT_FOUND') {
        throw new NotFoundException(`Người dùng với ID ${id} không tồn tại`);
      }
      if (res.error?.code === 'CONFLICT') {
        throw new ConflictException('Email đã tồn tại trong hệ thống');
      }
      this.throwFromServiceError(res);
    }

    const updated: IdentityUser = res.data;

    // Update functional role in AppUserRole (digital_book) — NOT membership tier
    let tenantRole: string = 'KIEM_SOAT';
    if (dto.vaiTro) {
      const currentTenantId = this.tenantContext.getCurrentTenantId();
      if (currentTenantId) {
        const appUserRole = await this.appUserRoleRepo.findOne({
          where: { userId: id, tenantId: currentTenantId } as any,
        });

        if (appUserRole) {
          appUserRole.role = dto.vaiTro;
          await this.appUserRoleRepo.save(appUserRole);
        } else {
          // Create if missing (e.g. user existed before AppUserRole table was introduced)
          const newRole = this.appUserRoleRepo.create({
            userId: id,
            tenantId: currentTenantId,
            role: dto.vaiTro,
            isActive: true,
          });
          await this.appUserRoleRepo.save(newRole);
        }
        tenantRole = dto.vaiTro;
      }
    }

    return this.mapToUserWithTenant(updated, tenantRole);
  }

  // ─── delete ────────────────────────────────────────────────────────────────

  async delete(token: string, id: string): Promise<void> {
    // Soft-delete user + credential + all memberships on identity side
    const delRes = await this.identityClient.deleteUser(token, id);
    if (!delRes.success) this.throwFromServiceError(delRes, `Người dùng với ID ${id} không tồn tại`);

    // Deactivate AppUserRole rows in digital_book
    const appUserRoles = await this.appUserRoleRepo.find({
      where: { userId: id } as any,
    });

    for (const aur of appUserRoles) {
      aur.isActive = false;
      await this.appUserRoleRepo.save(aur);
    }
  }

  // ─── toggleStatus ──────────────────────────────────────────────────────────

  async toggleStatus(token: string, id: string): Promise<UserWithTenant> {
    const res = await this.identityClient.toggleUserStatus(token, id);
    if (!res.success) {
      if (res.error?.code === 'NOT_FOUND') {
        throw new NotFoundException(`Người dùng với ID ${id} không tồn tại`);
      }
      this.throwFromServiceError(res);
    }

    return this.mapToUserWithTenant(res.data);
  }

  // ─── addExistingUser ───────────────────────────────────────────────────────

  async addExistingUser(token: string, dto: AddExistingUserDto): Promise<UserWithTenant> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (!tenantId) {
      throw new ConflictException('Không xác định được công ty hiện tại');
    }

    // Add membership in identity via IdentityClient
    const res = await this.identityClient.addMember(token, tenantId, {
      userId: dto.userId,
      role: 'member', // membership tier (NOT functional role)
    });

    if (!res.success) {
      if (res.error?.code === 'NOT_FOUND') {
        throw new NotFoundException('Người dùng không tồn tại');
      }
      if (res.error?.code === 'CONFLICT') {
        throw new ConflictException('Người dùng đã là thành viên của công ty này');
      }
      this.throwFromServiceError(res);
    }

    const memberData = res.data; // { userId, hoTen, email, role, isActive }

    // Update or create functional role in AppUserRole (digital_book)
    const existingAppUserRole = await this.appUserRoleRepo.findOne({
      where: { userId: dto.userId, tenantId } as any,
    });

    if (existingAppUserRole) {
      existingAppUserRole.role = dto.vaiTro;
      existingAppUserRole.isActive = true;
      await this.appUserRoleRepo.save(existingAppUserRole);
    } else {
      const newRole = this.appUserRoleRepo.create({
        userId: dto.userId,
        tenantId,
        role: dto.vaiTro,
        isActive: true,
      });
      await this.appUserRoleRepo.save(newRole);
    }

    // CONCERN: addMember response does not include trangThai/createdAt/updatedAt.
    // Defaulting trangThai to HOAT_DONG as user was just successfully added.
    return {
      _id: dto.userId,
      id: dto.userId,
      email: memberData.email,
      hoTen: memberData.hoTen,
      trangThai: UserStatus.HOAT_DONG,
      isActive: memberData.isActive ?? true,
      isSuperAdmin: memberData.email === SUPER_ADMIN_EMAIL,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantRole: dto.vaiTro,
    };
  }

  // ─── searchUsersNotInTenant ────────────────────────────────────────────────

  async searchUsersNotInTenant(
    token: string,
    search?: string,
  ): Promise<Array<{ id: string; email: string; hoTen: string }>> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (!tenantId) return [];

    // Get all users from identity (no tenantId filter — we want users OUTSIDE this tenant)
    const identityQuery: Record<string, string> = {};
    if (search) identityQuery.search = search;

    const res = await this.identityClient.listUsers(token, identityQuery);
    if (!res.success) this.throwFromServiceError(res);

    const allUsers: IdentityUser[] = res.data ?? [];

    // Filter out users who already belong to this tenant (check 'tenants' array from identity)
    const usersNotInTenant = allUsers.filter((u) => {
      if (!Array.isArray(u.tenants)) return true;
      return !u.tenants.some((t) => t.id === tenantId);
    });

    return usersNotInTenant.map((u) => ({
      id: u.id,
      email: u.email,
      hoTen: u.hoTen,
    }));
  }

  // ─── getStats ──────────────────────────────────────────────────────────────

  async getStats(token: string): Promise<NguoiDungStats> {
    const currentTenantId = this.tenantContext.getCurrentTenantId();

    const identityQuery: Record<string, string> = {};
    if (currentTenantId) identityQuery.tenantId = currentTenantId;

    const res = await this.identityClient.listUsers(token, identityQuery);
    if (!res.success) this.throwFromServiceError(res);

    const allUsers: IdentityUser[] = res.data ?? [];

    if (allUsers.length === 0) {
      return { tongNguoiDung: 0, dangHoatDong: 0, daKhoa: 0, theoVaiTro: {} };
    }

    // Get functional roles from AppUserRole (digital_book) for theoVaiTro stats
    const userIds = allUsers.map((u) => u.id);
    const whereRole: Record<string, any> = {
      userId: { $in: userIds } as any,
      isActive: true,
    };
    if (currentTenantId) {
      whereRole.tenantId = currentTenantId;
    }
    const appUserRoles = await this.appUserRoleRepo.find({ where: whereRole as any });

    const theoVaiTro: Record<string, number> = {};
    for (const aur of appUserRoles) {
      theoVaiTro[aur.role] = (theoVaiTro[aur.role] || 0) + 1;
    }

    return {
      tongNguoiDung: allUsers.length,
      dangHoatDong: allUsers.filter((u) => u.trangThai === UserStatus.HOAT_DONG).length,
      daKhoa: allUsers.filter((u) => u.trangThai === UserStatus.KHOA).length,
      theoVaiTro,
    };
  }
}
