import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { PhanQuyen } from '@app/entities';

const PERM_TTL_MS = 30_000;

interface ReqUser {
  tenantId?: string;
  vaiTro?: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
}

/**
 * Phân quyền cho Tài liệu. JWT KHÔNG mang permissions (đã bỏ vì quá lớn — auth
 * trả permissions trong response login cho FE, token để rỗng). Vì vậy phải nạp
 * permissions của vai trò từ `phan_quyen` lúc request, thay vì tin req.user.permissions.
 */
@Injectable()
export class DocPermService {
  private cache = new Map<string, { at: number; perms: string[] }>();

  constructor(
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`)
    private readonly phanQuyenRepo: Repository<PhanQuyen>,
  ) {}

  /** Nạp permissions của (tenantId, vaiTro) từ phan_quyen, cache ngắn. */
  async getPermissions(tenantId: string, vaiTro: string): Promise<string[]> {
    const key = `${tenantId}|${vaiTro}`;
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && now - hit.at < PERM_TTL_MS) return hit.perms;
    const pq = await this.phanQuyenRepo.findOne({
      where: { vaiTro, tenantId, isActive: true } as any,
    });
    const perms = pq?.permissions ?? [];
    this.cache.set(key, { at: now, perms });
    return perms;
  }

  /** Bypass SuperAdmin/`*`; ngược lại kiểm `/category:action` trên quyền nạp từ DB. */
  async assertPerm(
    user: ReqUser,
    category: string,
    action: string,
  ): Promise<void> {
    const perm = `/${category}:${action}`;
    if (user?.isSuperAdmin || (user?.permissions ?? []).includes('*')) return;
    if (!user?.tenantId || !user?.vaiTro) {
      throw new ForbiddenException(`Bạn không có quyền: ${perm}`);
    }
    const perms = await this.getPermissions(user.tenantId, user.vaiTro);
    if (perms.includes('*') || perms.includes(perm)) return;
    throw new ForbiddenException(`Bạn không có quyền: ${perm}`);
  }
}
