import { sanitizeUpdateDto, generateAllPermissions } from '@app/core';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Inject,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  VaiTro,
  PhanQuyen,
  Glossary,
  AppUserRole,
  TenantAppConfig,
} from '@app/entities';
import {
  CreateTenantDto,
  UpdateTenantDto,
  AddUserToTenantDto,
  UpdateTenantMemberDto,
  UpdateMemberProfileDto,
} from '@app/dto';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { IdentityClient } from '@app/service-client';

const ADMIN_ROLE_NAME = 'Admin';

export interface TenantAdminInfo {
  id: string;
  email: string;
  hoTen: string;
}

export interface TenantWithAdmin {
  _id: string;
  id: string;
  name: string;
  slug: string;
  maSoThue?: string;
  diaChi?: string;
  dienThoai?: string;
  email?: string;
  nguoiDaiDien?: string;
  isActive: boolean;
  modules: string[];
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
  admins: TenantAdminInfo[];
}

// Shape returned by identity /api/admin/tenants
interface IdentityTenant {
  id: string;
  name: string;
  slug: string;
  maSoThue?: string | null;
  diaChi?: string | null;
  dienThoai?: string | null;
  email?: string | null;
  nguoiDaiDien?: string | null;
  isActive: boolean;
  admins: TenantAdminInfo[];
  appIds?: string[];
}

// Shape returned by identity /api/admin/tenants/:id/members
interface IdentityMember {
  userId: string;
  hoTen: string | null;
  email: string | null;
  role: string;
  isActive: boolean;
}

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    // ── RAW repos (nhan_su DB, bypass tenant filtering) ─────────────────────
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`)
    private readonly vaiTroRepository: Repository<VaiTro>,
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`)
    private readonly phanQuyenRepository: Repository<PhanQuyen>,
    // ── Default connection repos (AppUserRole + TenantAppConfig are TENANT_EXEMPT) ──
    @InjectRepository(AppUserRole)
    private readonly appUserRoleRepository: Repository<AppUserRole>,
    @InjectRepository(TenantAppConfig)
    private readonly tenantAppConfigRepository: Repository<TenantAppConfig>,
    // ── IdentityClient: all identity DB operations go via HTTP ───────────────
    private readonly identityClient: IdentityClient,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Error handling
  // ──────────────────────────────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Fetch a single tenant by id from identity service.
   * CONCERN: no dedicated getTenant(id) API → calls listTenants and filters client-side.
   */
  private async findTenantById(token: string, id: string): Promise<IdentityTenant> {
    const res = await this.identityClient.listTenants(token);
    if (!res.success) this.throwFromServiceError(res);
    const tenant: IdentityTenant | undefined = (res.data ?? []).find(
      (t: IdentityTenant) => t.id === id,
    );
    if (!tenant) {
      throw new NotFoundException(`Không tìm thấy công ty với ID ${id}`);
    }
    return tenant;
  }

  /**
   * Deep-copy glossary of nganh by code.
   * hrm (HR app) has no industry glossary templates (Nganh entity removed in the fork),
   * so this always returns {}. Kept as a method so tenant create/update keep their shape.
   */
  async cloneGlossaryFromNganh(_nganhCode?: string | null): Promise<Glossary> {
    return {};
  }

  /** Map identity tenant + TenantAppConfig to TenantWithAdmin shape. */
  private mapToTenantWithAdmin(
    tenant: IdentityTenant,
    config: TenantAppConfig | null,
  ): TenantWithAdmin {
    // CONCERN: identity API does not return createdAt/updatedAt for tenants.
    // Defaulting to new Date(0) to maintain TenantWithAdmin shape for FE compatibility.
    return {
      _id: tenant.id,
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      maSoThue: tenant.maSoThue ?? undefined,
      diaChi: tenant.diaChi ?? undefined,
      dienThoai: tenant.dienThoai ?? undefined,
      email: tenant.email ?? undefined,
      nguoiDaiDien: tenant.nguoiDaiDien ?? undefined,
      isActive: tenant.isActive,
      modules: config?.modules ?? ['KE_TOAN'],
      tenantId: undefined,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      admins: tenant.admins ?? [],
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Tenant CRUD
  // ──────────────────────────────────────────────────────────────────────────

  async findAll(token: string): Promise<TenantWithAdmin[]> {
    const res = await this.identityClient.listTenants(token);
    if (!res.success) this.throwFromServiceError(res);

    const tenants: IdentityTenant[] = res.data ?? [];

    return Promise.all(
      tenants.map(async (tenant) => {
        const config = await this.tenantAppConfigRepository.findOne({
          where: { tenantId: tenant.id },
        });
        return this.mapToTenantWithAdmin(tenant, config);
      }),
    );
  }

  /**
   * Public findOne: fetch tenant from identity and merge config from TenantAppConfig.
   * Returns a Tenant-shaped POJO (not a TypeORM entity) for FE JSON compatibility.
   * CONCERN: no dedicated getTenant(id) API → uses listTenants + client-side filter.
   */
  async findOne(token: string, id: string): Promise<any> {
    const tenant = await this.findTenantById(token, id);

    const config = await this.tenantAppConfigRepository.findOne({
      where: { tenantId: id },
    });

    return {
      _id: tenant.id,
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      maSoThue: tenant.maSoThue ?? null,
      diaChi: tenant.diaChi ?? null,
      dienThoai: tenant.dienThoai ?? null,
      email: tenant.email ?? null,
      nguoiDaiDien: tenant.nguoiDaiDien ?? null,
      isActive: tenant.isActive,
      modules: config?.modules ?? ['KE_TOAN'],
      nganh: config?.nganh ?? null,
      glossary: config?.glossary ?? {},
      dashboardBlocks: config?.dashboardBlocks ?? null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      tenantId: null,
      admins: tenant.admins ?? [],
    };
  }

  async findBySlug(token: string, slug: string): Promise<IdentityTenant | null> {
    const res = await this.identityClient.listTenants(token, { search: slug });
    if (!res.success) this.throwFromServiceError(res);
    const tenants: IdentityTenant[] = res.data ?? [];
    return tenants.find((t) => t.slug === slug) ?? null;
  }

  async create(
    token: string,
    createDto: CreateTenantDto,
  ): Promise<{ tenant: any; admin?: { id?: string; email?: string; hoTen?: string } }> {
    // Pre-validate: identity requires adminUserId OR admin.email
    if (!createDto.adminUserId && !createDto.admin?.email) {
      throw new BadRequestException('Cần cung cấp adminUserId hoặc admin (email + hoTen)');
    }

    // Build identity request body
    const tenantBody: Record<string, unknown> = {
      name: createDto.name,
      slug: createDto.slug,
      isActive: createDto.isActive ?? true,
    };
    if (createDto.maSoThue) tenantBody.maSoThue = createDto.maSoThue;
    if (createDto.diaChi) tenantBody.diaChi = createDto.diaChi;
    if (createDto.dienThoai) tenantBody.dienThoai = createDto.dienThoai;
    if (createDto.email) tenantBody.email = createDto.email;
    if (createDto.nguoiDaiDien) tenantBody.nguoiDaiDien = createDto.nguoiDaiDien;

    // Pass admin info to identity for provisioning
    if (createDto.adminUserId) {
      tenantBody.adminUserId = createDto.adminUserId;
    } else if (createDto.admin) {
      tenantBody.adminEmail = createDto.admin.email.toLowerCase();
      tenantBody.adminHoTen = createDto.admin.hoTen;
      if (createDto.admin.password) tenantBody.adminPassword = createDto.admin.password;
    }
    // CONCERN: identity requires adminUserId or adminEmail+adminHoTen.
    // If neither supplied, identity service will throw BadRequestException at runtime.

    const res = await this.identityClient.createTenant(token, tenantBody);
    if (!res.success) {
      if (res.error?.code === 'CONFLICT') {
        throw new ConflictException(`Công ty với slug ${createDto.slug} đã tồn tại`);
      }
      this.throwFromServiceError(res);
    }

    const createdTenant: IdentityTenant = res.data;
    const tenantId = createdTenant.id;

    // Clone glossary from nganh (no-op in hrm — returns {})
    const glossary = await this.cloneGlossaryFromNganh(createDto.nganh);

    // Create TenantAppConfig (nhan_su)
    const tenantConfig = this.tenantAppConfigRepository.create({
      tenantId,
      modules: createDto.modules?.length ? createDto.modules : ['KE_TOAN'],
      nganh: createDto.nganh ?? null,
      glossary,
      dashboardBlocks: null,
    });
    await this.tenantAppConfigRepository.save(tenantConfig);

    // Create AppUserRole for admin in nhan_su (functional role)
    if (createdTenant.admins?.length > 0) {
      const adminId = createdTenant.admins[0].id;
      const existingAppRole = await this.appUserRoleRepository.findOne({
        where: { userId: adminId, tenantId } as any,
      });
      if (!existingAppRole) {
        await this.appUserRoleRepository.save(
          this.appUserRoleRepository.create({
            userId: adminId,
            tenantId,
            role: ADMIN_ROLE_NAME,
            isActive: true,
          }),
        );
      }
    }

    // Auto-create 'Admin' VaiTro + PhanQuyen (full perms) in nhan_su
    await this.ensureAdminRole(tenantId);

    const savedTenant = {
      ...createdTenant,
      _id: tenantId,
      modules: tenantConfig.modules,
      nganh: tenantConfig.nganh,
      glossary: tenantConfig.glossary,
      dashboardBlocks: tenantConfig.dashboardBlocks ?? null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      tenantId: null,
    };

    const adminInfo = createdTenant.admins?.[0]
      ? {
          id: createdTenant.admins[0].id,
          email: createdTenant.admins[0].email,
          hoTen: createdTenant.admins[0].hoTen,
        }
      : undefined;

    return { tenant: savedTenant, admin: adminInfo };
  }

  /**
   * Ensure "Admin" role exists in vai_tro and has full permissions in phan_quyen
   * for the given tenant in nhan_su DB.
   */
  private async ensureAdminRole(tenantId: string): Promise<void> {
    try {
      const existingRole = await this.vaiTroRepository.findOne({
        where: { ten: ADMIN_ROLE_NAME },
      });

      if (!existingRole) {
        const adminRole = this.vaiTroRepository.create({
          ten: ADMIN_ROLE_NAME,
          moTa: 'Quản trị viên - toàn quyền',
          isActive: true,
        });
        await this.vaiTroRepository.save(adminRole);
      }

      const existingPhanQuyen = await this.phanQuyenRepository.findOne({
        where: { vaiTro: ADMIN_ROLE_NAME, tenantId },
      });

      if (!existingPhanQuyen) {
        const phanQuyen = this.phanQuyenRepository.create({
          vaiTro: ADMIN_ROLE_NAME,
          ten: ADMIN_ROLE_NAME,
          moTa: 'Toàn quyền hệ thống',
          tenantId,
          permissions: generateAllPermissions(),
          isActive: true,
        });
        await this.phanQuyenRepository.save(phanQuyen);
      } else if (!existingPhanQuyen.permissions || existingPhanQuyen.permissions.length === 0) {
        existingPhanQuyen.permissions = generateAllPermissions();
        await this.phanQuyenRepository.save(existingPhanQuyen);
      }
    } catch (error) {
      this.logger.warn(`Failed to ensure admin role: ${error.message}`);
    }
  }

  async update(token: string, id: string, updateDto: UpdateTenantDto): Promise<any> {
    // Verify tenant exists first
    await this.findTenantById(token, id);

    // Split identity fields vs config fields
    const { modules, nganh, ...identityFields } = sanitizeUpdateDto(updateDto) as any;

    // Build identity update body (only defined fields)
    const identityBody: Record<string, unknown> = {};
    for (const key of ['name', 'slug', 'maSoThue', 'diaChi', 'dienThoai', 'email', 'nguoiDaiDien', 'isActive']) {
      if (identityFields[key] !== undefined) identityBody[key] = identityFields[key];
    }

    let updatedTenant: IdentityTenant;
    if (Object.keys(identityBody).length > 0) {
      const res = await this.identityClient.updateTenant(token, id, identityBody);
      if (!res.success) {
        if (res.error?.code === 'NOT_FOUND') {
          throw new NotFoundException(`Không tìm thấy công ty với ID ${id}`);
        }
        if (res.error?.code === 'CONFLICT') {
          throw new ConflictException('Slug đã tồn tại');
        }
        this.throwFromServiceError(res);
      }
      updatedTenant = res.data;
    } else {
      updatedTenant = await this.findTenantById(token, id);
    }

    // Upsert TenantAppConfig when config fields are present
    let config: TenantAppConfig | null = null;
    if (modules !== undefined || nganh !== undefined) {
      config = await this.tenantAppConfigRepository.findOne({ where: { tenantId: id } });
      if (!config) {
        config = this.tenantAppConfigRepository.create({
          tenantId: id,
          modules: modules ?? ['KE_TOAN'],
          nganh: nganh ?? null,
          glossary: {},
          dashboardBlocks: null,
        });
      } else {
        if (modules !== undefined) config.modules = modules;
        if (nganh !== undefined) config.nganh = nganh;
      }
      await this.tenantAppConfigRepository.save(config);
    } else {
      config = await this.tenantAppConfigRepository.findOne({ where: { tenantId: id } });
    }

    return {
      _id: updatedTenant.id,
      id: updatedTenant.id,
      name: updatedTenant.name,
      slug: updatedTenant.slug,
      maSoThue: updatedTenant.maSoThue ?? null,
      diaChi: updatedTenant.diaChi ?? null,
      dienThoai: updatedTenant.dienThoai ?? null,
      email: updatedTenant.email ?? null,
      nguoiDaiDien: updatedTenant.nguoiDaiDien ?? null,
      isActive: updatedTenant.isActive,
      modules: config?.modules ?? ['KE_TOAN'],
      nganh: config?.nganh ?? null,
      glossary: config?.glossary ?? {},
      dashboardBlocks: config?.dashboardBlocks ?? null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      tenantId: null,
      admins: updatedTenant.admins ?? [],
    };
  }

  /** Write glossary for a tenant (self-service: company admin edits their labels). */
  async updateGlossary(token: string, tenantId: string, glossary: Glossary): Promise<any> {
    // Verify tenant exists via identity
    const tenant = await this.findTenantById(token, tenantId);

    // Upsert TenantAppConfig glossary (nhan_su)
    let config = await this.tenantAppConfigRepository.findOne({ where: { tenantId } });
    if (!config) {
      config = this.tenantAppConfigRepository.create({
        tenantId,
        modules: ['KE_TOAN'],
        nganh: null,
        glossary: glossary ?? {},
        dashboardBlocks: null,
      });
    } else {
      config.glossary = glossary ?? {};
    }
    await this.tenantAppConfigRepository.save(config);

    return {
      _id: tenant.id,
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      maSoThue: tenant.maSoThue ?? null,
      diaChi: tenant.diaChi ?? null,
      dienThoai: tenant.dienThoai ?? null,
      email: tenant.email ?? null,
      nguoiDaiDien: tenant.nguoiDaiDien ?? null,
      isActive: tenant.isActive,
      modules: config.modules,
      nganh: config.nganh ?? null,
      glossary: config.glossary,
      dashboardBlocks: config.dashboardBlocks ?? null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      tenantId: null,
      admins: tenant.admins ?? [],
    };
  }

  /** Read dashboard block config for tenant; null = not configured (show all). */
  async getDashboardBlocks(token: string, tenantId: string): Promise<string[] | null> {
    await this.findTenantById(token, tenantId);
    const config = await this.tenantAppConfigRepository.findOne({ where: { tenantId } });
    return config?.dashboardBlocks ?? null;
  }

  /** Overwrite dashboard blocks for a tenant. */
  async updateDashboardBlocks(
    token: string,
    tenantId: string,
    blocks: string[],
  ): Promise<{ dashboardBlocks: string[] }> {
    await this.findTenantById(token, tenantId);

    const dashboardBlocks = Array.isArray(blocks) ? blocks : [];
    let config = await this.tenantAppConfigRepository.findOne({ where: { tenantId } });
    if (!config) {
      config = this.tenantAppConfigRepository.create({
        tenantId,
        modules: ['KE_TOAN'],
        nganh: null,
        glossary: {},
        dashboardBlocks,
      });
    } else {
      config.dashboardBlocks = dashboardBlocks;
    }
    await this.tenantAppConfigRepository.save(config);
    return { dashboardBlocks };
  }

  async delete(token: string, id: string): Promise<void> {
    // identity handles cascade deactivation of memberships
    const delRes = await this.identityClient.deleteTenant(token, id);
    if (!delRes.success) this.throwFromServiceError(delRes, `Không tìm thấy công ty với ID ${id}`);

    // Deactivate all AppUserRole rows for this tenant (nhan_su)
    const appRoles = await this.appUserRoleRepository.find({
      where: { tenantId: id, isActive: true } as any,
    });
    if (appRoles.length > 0) {
      for (const role of appRoles) {
        role.isActive = false;
      }
      await this.appUserRoleRepository.save(appRoles);
    }
  }

  async hardDelete(token: string, id: string): Promise<void> {
    const delRes = await this.identityClient.deleteTenant(token, id);
    if (!delRes.success) this.throwFromServiceError(delRes, `Không tìm thấy công ty với ID ${id}`);

    // Remove TenantAppConfig for this tenant
    const config = await this.tenantAppConfigRepository.findOne({ where: { tenantId: id } });
    if (config) {
      await this.tenantAppConfigRepository.remove(config);
    }

    // Remove all AppUserRole rows for this tenant
    const appRoles = await this.appUserRoleRepository.find({ where: { tenantId: id } as any });
    if (appRoles.length > 0) {
      await this.appUserRoleRepository.remove(appRoles);
    }
  }

  async getAllUsers(token: string): Promise<Array<{ id: string; email: string; hoTen: string }>> {
    const res = await this.identityClient.listUsers(token, {});
    if (!res.success) this.throwFromServiceError(res);

    const users: any[] = res.data ?? [];
    return users.map((u: any) => ({
      id: u.id,
      email: u.email,
      hoTen: u.hoTen,
    }));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Member management
  // ──────────────────────────────────────────────────────────────────────────

  async getTenantMembers(
    token: string,
    tenantId: string,
  ): Promise<
    Array<{
      id: string;
      email: string;
      hoTen: string;
      role: string;
      isActive: boolean;
      membershipId: string;
    }>
  > {
    // Verify tenant exists
    await this.findTenantById(token, tenantId);

    const membRes = await this.identityClient.listMembers(token, tenantId);
    if (!membRes.success) this.throwFromServiceError(membRes);

    const memberships: IdentityMember[] = membRes.data ?? [];
    if (memberships.length === 0) return [];

    // Load functional roles from AppUserRole (nhan_su) — keyed by userId
    const appRoles = await this.appUserRoleRepository.find({
      where: { tenantId } as any,
    });
    const appRoleMap = new Map(appRoles.map((r) => [r.userId, r.role]));

    return memberships.map((m) => ({
      id: m.userId,
      email: m.email ?? '',
      hoTen: m.hoTen ?? '',
      // Functional role from AppUserRole; fall back to identity membership role
      role: appRoleMap.get(m.userId) ?? m.role ?? '',
      isActive: m.isActive,
      // CONCERN: identity doesn't return membership _id; using userId as membershipId
      membershipId: m.userId,
    }));
  }

  async addUserToTenant(
    token: string,
    tenantId: string,
    dto: AddUserToTenantDto,
  ): Promise<{
    user: { id: string; email: string; hoTen: string };
    role: string;
    isNew: boolean;
  }> {
    // Verify tenant exists
    await this.findTenantById(token, tenantId);

    let memberBody: Record<string, unknown>;
    let isNew = false;

    if (dto.userId) {
      memberBody = { userId: dto.userId, role: 'member' };
    } else if (dto.email) {
      // Check if user already exists via identity
      const searchRes = await this.identityClient.listUsers(token, { search: dto.email });
      const existing = searchRes.success
        ? (searchRes.data ?? []).find(
            (u: any) => u.email?.toLowerCase() === dto.email!.toLowerCase(),
          )
        : null;

      if (existing) {
        memberBody = { userId: existing.id, role: 'member' };
      } else {
        // New user — identity addMember creates user via email+hoTen
        memberBody = {
          email: dto.email.toLowerCase(),
          hoTen: dto.hoTen ?? '',
          role: 'member',
          ...(dto.password ? { password: dto.password } : {}),
        };
        isNew = true;
      }
    } else {
      throw new ConflictException('Phải cung cấp userId hoặc email');
    }

    const res = await this.identityClient.addMember(token, tenantId, memberBody);
    if (!res.success) {
      if (res.error?.code === 'NOT_FOUND') {
        throw new NotFoundException('Không tìm thấy người dùng');
      }
      if (res.error?.code === 'CONFLICT') {
        throw new ConflictException('User đã là thành viên của công ty này');
      }
      this.throwFromServiceError(res);
    }

    const memberData = res.data; // { userId, hoTen, email, role, isActive }
    const userId = memberData.userId;

    // Upsert functional role in AppUserRole (nhan_su)
    const existingAppRole = await this.appUserRoleRepository.findOne({
      where: { userId, tenantId } as any,
    });
    if (existingAppRole) {
      existingAppRole.role = dto.role;
      existingAppRole.isActive = true;
      await this.appUserRoleRepository.save(existingAppRole);
    } else {
      await this.appUserRoleRepository.save(
        this.appUserRoleRepository.create({
          userId,
          tenantId,
          role: dto.role,
          isActive: true,
        }),
      );
    }

    return {
      user: {
        id: userId,
        email: memberData.email ?? '',
        hoTen: memberData.hoTen ?? '',
      },
      role: dto.role,
      isNew,
    };
  }

  async updateTenantMember(
    token: string,
    tenantId: string,
    userId: string,
    dto: UpdateTenantMemberDto,
  ): Promise<void> {
    // Update identity membership (isActive) if provided
    if (dto.isActive !== undefined) {
      const res = await this.identityClient.updateMember(token, tenantId, userId, {
        isActive: dto.isActive,
      });
      if (!res.success) {
        if (res.error?.code === 'NOT_FOUND') {
          throw new NotFoundException('Không tìm thấy thành viên trong công ty này');
        }
        this.throwFromServiceError(res);
      }
    } else {
      // Verify membership exists when only updating functional role
      const membRes = await this.identityClient.listMembers(token, tenantId);
      if (!membRes.success) this.throwFromServiceError(membRes);
      const exists = (membRes.data ?? []).some((m: IdentityMember) => m.userId === userId);
      if (!exists) throw new NotFoundException('Không tìm thấy thành viên trong công ty này');
    }

    // Update functional role in AppUserRole (nhan_su) — NOT identity membership.role
    if (dto.role !== undefined) {
      const existingAppRole = await this.appUserRoleRepository.findOne({
        where: { userId, tenantId } as any,
      });
      if (existingAppRole) {
        existingAppRole.role = dto.role;
        existingAppRole.isActive = true;
        await this.appUserRoleRepository.save(existingAppRole);
      } else {
        await this.appUserRoleRepository.save(
          this.appUserRoleRepository.create({
            userId,
            tenantId,
            role: dto.role,
            isActive: true,
          }),
        );
      }
    }
  }

  async updateMemberProfile(
    token: string,
    tenantId: string,
    userId: string,
    dto: UpdateMemberProfileDto,
  ): Promise<{ id: string; email: string; hoTen: string }> {
    // Verify membership via listMembers
    const membRes = await this.identityClient.listMembers(token, tenantId);
    if (!membRes.success) this.throwFromServiceError(membRes);
    const member: IdentityMember | undefined = (membRes.data ?? []).find(
      (m: IdentityMember) => m.userId === userId && m.isActive,
    );
    if (!member) throw new NotFoundException('Không tìm thấy thành viên trong công ty này');

    // Update user profile via identity
    const updateBody: Record<string, unknown> = {};
    if (dto.email) updateBody.email = dto.email.toLowerCase();
    if (dto.hoTen !== undefined) updateBody.hoTen = dto.hoTen;

    if (Object.keys(updateBody).length > 0) {
      const res = await this.identityClient.updateUser(token, userId, updateBody);
      if (!res.success) {
        if (res.error?.code === 'NOT_FOUND') {
          throw new NotFoundException('Không tìm thấy người dùng');
        }
        if (res.error?.code === 'CONFLICT') {
          throw new ConflictException('Email đã được sử dụng');
        }
        this.throwFromServiceError(res);
      }
      const updated = res.data;
      return { id: userId, email: updated.email, hoTen: updated.hoTen };
    }

    return { id: userId, email: member.email ?? '', hoTen: member.hoTen ?? '' };
  }

  async resetMemberPassword(
    token: string,
    tenantId: string,
    userId: string,
  ): Promise<{ defaultPassword: string }> {
    // Verify membership
    const membRes = await this.identityClient.listMembers(token, tenantId);
    if (!membRes.success) this.throwFromServiceError(membRes);
    const member: IdentityMember | undefined = (membRes.data ?? []).find(
      (m: IdentityMember) => m.userId === userId && m.isActive,
    );
    if (!member) throw new NotFoundException('Không tìm thấy thành viên trong công ty này');

    // Reset password via identity
    const res = await this.identityClient.resetPassword(token, userId, {});
    if (!res.success) this.throwFromServiceError(res);

    return { defaultPassword: res.data?.defaultPassword ?? '123456' };
  }

  async removeTenantMember(token: string, tenantId: string, userId: string): Promise<void> {
    const res = await this.identityClient.removeMember(token, tenantId, userId);
    if (!res.success) {
      if (res.error?.code === 'NOT_FOUND') {
        throw new NotFoundException('Không tìm thấy thành viên trong công ty này');
      }
      this.throwFromServiceError(res);
    }

    // Deactivate functional role in AppUserRole (nhan_su)
    const appRole = await this.appUserRoleRepository.findOne({
      where: { userId, tenantId } as any,
    });
    if (appRole) {
      appRole.isActive = false;
      await this.appUserRoleRepository.save(appRole);
    }
  }
}
