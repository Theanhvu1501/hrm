import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppUserRole, TenantAppConfig, PhanQuyen, VaiTro } from '@app/entities';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { generateAllPermissions } from '@app/core';

const ADMIN_ROLE_NAME = 'Admin';

/**
 * ProvisioningService — idempotent Kế toán-side provisioning for a tenant.
 *
 * Only touches digital_book collections:
 *   TenantAppConfig, VaiTro, PhanQuyen, AppUserRole.
 * No dependency on 'identity' connection.
 *
 * Called via:
 *   - AuthServiceService.ensureKeToanProvisioned (delegation, DRY)
 *   - POST /provisioning/ensure (standalone endpoint, for SSO migration)
 */
@Injectable()
export class ProvisioningService {
  constructor(
    @InjectRepository(AppUserRole)
    private readonly appUserRoleRepo: Repository<AppUserRole>,
    @InjectRepository(TenantAppConfig)
    private readonly tenantAppConfigRepo: Repository<TenantAppConfig>,
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`)
    private readonly phanQuyenRepo: Repository<PhanQuyen>,
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`)
    private readonly vaiTroRepo: Repository<VaiTro>,
  ) {}

  /**
   * Idempotent provisioning — each step is guarded by findOne.
   * Subsequent calls are cheap (no-op when already provisioned).
   */
  async ensure(
    tenantId: string,
    userId: string,
    isCompanyAdmin: boolean,
  ): Promise<void> {
    // Step 1: Ensure TenantAppConfig exists
    const existingConfig = await this.tenantAppConfigRepo.findOne({
      where: { tenantId } as any,
    });
    if (!existingConfig) {
      const newConfig = this.tenantAppConfigRepo.create({
        tenantId,
        modules: ['KE_TOAN'],
        glossary: {},
        nganh: null,
        dashboardBlocks: null,
      });
      await this.tenantAppConfigRepo.save(newConfig);
    }

    // Steps 2-3 only for company admins
    if (!isCompanyAdmin) return;

    // Step 2: Ensure VaiTro 'Admin' exists + PhanQuyen for this tenant
    const existingVaiTro = await this.vaiTroRepo.findOne({
      where: { ten: ADMIN_ROLE_NAME },
    } as any);
    if (!existingVaiTro) {
      const adminVaiTro = this.vaiTroRepo.create({
        ten: ADMIN_ROLE_NAME,
        moTa: 'Quản trị viên - toàn quyền',
        isActive: true,
      });
      await this.vaiTroRepo.save(adminVaiTro);
    }

    const existingPhanQuyen = await this.phanQuyenRepo.findOne({
      where: { vaiTro: ADMIN_ROLE_NAME, tenantId },
    } as any);
    if (!existingPhanQuyen) {
      const phanQuyen = this.phanQuyenRepo.create({
        vaiTro: ADMIN_ROLE_NAME,
        ten: ADMIN_ROLE_NAME,
        moTa: 'Toàn quyền hệ thống',
        tenantId,
        permissions: generateAllPermissions(),
        isActive: true,
      });
      await this.phanQuyenRepo.save(phanQuyen);
    } else if (
      !existingPhanQuyen.permissions ||
      existingPhanQuyen.permissions.length === 0
    ) {
      existingPhanQuyen.permissions = generateAllPermissions();
      await this.phanQuyenRepo.save(existingPhanQuyen);
    }

    // Step 3: Ensure AppUserRole 'Admin' exists for this user
    const existingAppRole = await this.appUserRoleRepo.findOne({
      where: { userId, tenantId, isActive: true },
    } as any);
    if (!existingAppRole) {
      const appRole = this.appUserRoleRepo.create({
        userId,
        tenantId,
        role: ADMIN_ROLE_NAME,
        isActive: true,
      });
      await this.appUserRoleRepo.save(appRole);
    }
  }
}
