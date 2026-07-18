import {
  Injectable,
  Inject,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppUserRole, TenantAppConfig, PhanQuyen } from '@app/entities';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { VerifyTokenDto } from './dto';
import { JwtService, UserPayload } from '@app/auth';
import {
  TenantInfo,
  SelectTenantResponse,
  AuthUserResponse,
} from '@app/dto';
import { ProvisioningService } from './provisioning/provisioning.service';
import { IdentityClient } from '@app/service-client';

const SALT_ROUNDS = 10;

/** Shape returned by identity /api/me and /api/switch-tenant for a tenant entry */
interface IdentityTenantData {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
}

@Injectable()
export class AuthServiceService {
  private readonly logger = new Logger(AuthServiceService.name);

  constructor(
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`)
    private readonly phanQuyenRepo: Repository<PhanQuyen>,
    @InjectRepository(AppUserRole)
    private readonly appUserRoleRepo: Repository<AppUserRole>,
    @InjectRepository(TenantAppConfig)
    private readonly tenantAppConfigRepo: Repository<TenantAppConfig>,
    private readonly jwtService: JwtService,
    private readonly provisioningService: ProvisioningService,
    private readonly identityClient: IdentityClient,
  ) {}

  // ─── Error handling ─────────────────────────────────────────────────────────

  private throwFromServiceError(
    res: { success: boolean; error?: { code?: string; message?: string } },
  ): never {
    const { code, message } = res.error ?? {};
    if (code === 'NOT_FOUND') {
      throw new UnauthorizedException(message ?? 'Không tìm thấy người dùng');
    }
    if (code === 'FORBIDDEN') throw new ForbiddenException(message ?? 'Không có quyền');
    if (code === 'UNAUTHORIZED') throw new UnauthorizedException(message ?? 'Chưa xác thực');
    throw new InternalServerErrorException(message ?? 'Lỗi từ identity service');
  }

  // ─── digital_book helpers ───────────────────────────────────────────────────

  /**
   * Load permissions from PhanQuyen entity by role name and tenant
   */
  private async loadPermissions(vaiTro: string, tenantId: string): Promise<string[]> {
    const phanQuyen = await this.phanQuyenRepo.findOne({
      where: { vaiTro, tenantId, isActive: true },
    });
    return phanQuyen?.permissions || [];
  }

  /**
   * Build TenantInfo from digital_book enrichment + identity tenant data
   */
  private buildTenantInfo(
    role: string,
    tenantData: IdentityTenantData,
    cfg: TenantAppConfig | null,
  ): TenantInfo {
    return {
      tenantId: tenantData.tenantId,
      tenantName: tenantData.tenantName,
      tenantSlug: tenantData.tenantSlug,
      role,
      modules: cfg?.modules?.length ? cfg.modules : ['KE_TOAN'],
      glossary: cfg?.glossary ?? {},
      nganh: cfg?.nganh ?? null,
    };
  }

  /**
   * Enrich a single tenant entry from identity with digital_book role + config.
   */
  private async enrichTenant(
    userId: string,
    tenantData: IdentityTenantData,
  ): Promise<TenantInfo> {
    const { tenantId } = tenantData;
    const aur = await this.appUserRoleRepo.findOne({
      where: { userId, tenantId, isActive: true } as any,
    });
    const role = aur?.role || 'KIEM_SOAT';
    const cfg = await this.tenantAppConfigRepo.findOne({
      where: { tenantId } as any,
    });
    return this.buildTenantInfo(role, tenantData, cfg);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Verify a JWT token and return decoded payload
   */
  verify(verifyDto: VerifyTokenDto): UserPayload {
    try {
      const decoded = this.jwtService.verify(verifyDto.token);
      return {
        id: decoded.sub,
        email: decoded.email,
        tenantId: decoded.tenantId,
        vaiTro: decoded.vaiTro,
        permissions: decoded.permissions,
      };
    } catch (error) {
      throw new UnauthorizedException((error as Error).message);
    }
  }

  /**
   * Get current user profile with tenant info.
   *
   * New flow (Task 5.1b):
   *   1. identityClient.getMe(token)  → user + current tenant (name/slug)
   *   2. identityClient.getMyTenantsForApp(token, 'nhan-su') → nhan-su tenant list
   *   3. Enrich each nhan-su tenant with digital_book (AppUserRole + TenantAppConfig)
   *   4. Build current tenant + load permissions from PhanQuyen
   */
  async getMe(
    token: string,
    userId: string,
    tenantId: string,
  ): Promise<{
    user: AuthUserResponse;
    tenant?: TenantInfo;
    availableTenants: TenantInfo[];
    permissions: string[];
  }> {
    // 1. Get user + current tenant from identity
    const meRes = await this.identityClient.getMe(token);
    if (!meRes.success) this.throwFromServiceError(meRes);
    const meData = meRes.data as {
      user: AuthUserResponse;
      tenant?: IdentityTenantData;
    };

    // 2. Get nhan-su tenants from identity
    const tenantsRes = await this.identityClient.getMyTenantsForApp(token, 'nhan-su');
    if (!tenantsRes.success) this.throwFromServiceError(tenantsRes);
    const nhanSuTenants: IdentityTenantData[] = tenantsRes.data ?? [];

    const isSuperAdmin = meData.user.isSuperAdmin;

    // 3. Enrich availableTenants with digital_book role + config
    // Super admin: force role to 'SUPER_ADMIN' (skip AppUserRole lookup to avoid KIEM_SOAT default)
    const availableTenants: TenantInfo[] = await Promise.all(
      nhanSuTenants.map(async (t) => {
        if (isSuperAdmin) {
          const cfg = await this.tenantAppConfigRepo.findOne({
            where: { tenantId: t.tenantId } as any,
          });
          return this.buildTenantInfo('SUPER_ADMIN', t, cfg);
        }
        return this.enrichTenant(userId, t);
      }),
    );

    // 4. Build current tenant + permissions
    let tenant: TenantInfo | undefined;
    let permissions: string[];

    if (isSuperAdmin) {
      // Super admin: full permissions, current tenant with SUPER_ADMIN role
      permissions = ['*'];
      if (tenantId && meData.tenant) {
        const cfg = await this.tenantAppConfigRepo.findOne({
          where: { tenantId } as any,
        });
        tenant = this.buildTenantInfo('SUPER_ADMIN', meData.tenant, cfg);
      }
    } else if (tenantId && meData.tenant) {
      tenant = await this.enrichTenant(userId, meData.tenant);
      permissions = await this.loadPermissions(tenant.role, tenantId);
    } else {
      permissions = [];
    }

    return { user: meData.user, tenant, availableTenants, permissions };
  }

  /**
   * Switch tenant for an already-authenticated user.
   *
   * New flow (Task 5.1b):
   *   1. identityClient.switchTenant(token, tenantId) → accessToken + tenant + user
   *   2. Enrich tenant with digital_book (AppUserRole + TenantAppConfig)
   *   3. Load permissions from PhanQuyen
   *   4. Trigger lazy provisioning (TenantAppConfig only; admin role via ProvisioningController)
   */
  async switchTenant(
    token: string,
    userId: string,
    tenantId: string,
  ): Promise<SelectTenantResponse> {
    // 1. Proxy to identity
    const res = await this.identityClient.switchTenant(token, tenantId);
    if (!res.success) this.throwFromServiceError(res);
    const { accessToken, tenant: tenantData, user } = res.data as {
      accessToken: string;
      tenant: IdentityTenantData;
      user: AuthUserResponse;
    };

    // 2. Enrich tenant with digital_book
    const tenantInfo = await this.enrichTenant(userId, tenantData);

    // 3. Load permissions
    const permissions: string[] = user.isSuperAdmin
      ? ['*']
      : await this.loadPermissions(tenantInfo.role, tenantId);

    // 4. Lazy-provision TenantAppConfig if missing (isCompanyAdmin=false — admin role handled by ProvisioningController)
    try {
      await this.provisioningService.ensure(tenantId, userId, false);
    } catch (err) {
      this.logger.warn(
        `provisioning failed for tenant ${tenantId}: ${(err as Error).message}`,
      );
    }

    return { accessToken, tenant: tenantInfo, user, permissions };
  }

  /**
   * Logout - invalidate token (placeholder for token blacklist)
   */
  logout(userId: string): { message: string } {
    // In a production system, you would add the token to a blacklist.
    // For now, we just return success.
    return { message: 'Đăng xuất thành công' };
  }

  // ─── Static helpers (used in existing property-based tests) ─────────────────

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
