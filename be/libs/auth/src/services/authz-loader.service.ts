import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppUserRole, PhanQuyen, SUPER_ADMIN_EMAIL } from '@app/entities';

export interface LoadedAuthz {
  vaiTro: string;
  permissions: string[];
}

const TTL_MS = 30_000;

@Injectable()
export class AuthzLoaderService {
  private cache = new Map<string, { at: number; data: LoadedAuthz }>();

  constructor(private readonly dataSource: DataSource) {}

  async load(userId: string, tenantId: string, email: string): Promise<LoadedAuthz> {
    if (email === SUPER_ADMIN_EMAIL) {
      return { vaiTro: 'SUPER_ADMIN', permissions: ['*'] };
    }
    const key = `${userId}|${tenantId}`;
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && now - cached.at < TTL_MS) return cached.data;

    try {
      const ut = await this.dataSource
        .getRepository(AppUserRole)
        .findOne({ where: { userId, tenantId, isActive: true } as any });
      if (!ut) {
        const data = { vaiTro: '', permissions: [] };
        this.cache.set(key, { at: now, data }); // non-member: no role, no perms
        return data;
      }
      const vaiTro = ut.role || 'KIEM_SOAT';
      const pq = await this.dataSource
        .getRepository(PhanQuyen)
        .findOne({ where: { vaiTro, tenantId, isActive: true } as any });
      const data = { vaiTro, permissions: pq?.permissions ?? [] };
      this.cache.set(key, { at: now, data }); // chỉ cache khi thành công
      return data;
    } catch {
      return { vaiTro: '', permissions: [] }; // KHÔNG cache lỗi → request sau retry DB
    }
  }
}
