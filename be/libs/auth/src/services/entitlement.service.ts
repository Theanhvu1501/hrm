import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MenuCatalog, LinhVuc, TenantAppConfig } from '@app/entities';

const CONFIG_TTL_MS = 60_000;

@Injectable()
export class EntitlementService {
  private cache: { at: number; menus: MenuCatalog[]; linhVucs: LinhVuc[] } | null = null;

  constructor(private readonly dataSource: DataSource) {}

  /** null = path không thuộc menu nào (dùng chung). Ngược lại: code lĩnh vực sở hữu (≥1). */
  async resolveOwningCodes(fullPath: string): Promise<string[] | null> {
    const { menus, linhVucs } = await this.loadConfig();

    const matchedKeys = new Set<string>();
    for (const m of menus) {
      const prefixes = m.apiPrefixes ?? [];
      if (prefixes.some((p) => p && this.isPrefix(fullPath, p))) {
        matchedKeys.add(m.menuKey);
      }
    }
    if (matchedKeys.size === 0) return null;

    // Lĩnh vực sở hữu menu nếu menuKeys của nó "phủ" menuKey khớp được — theo
    // PREFIX semantics giống FE (LinhVuc lưu key section vd '/kho' phủ trang
    // con '/kho/nhap-kho'). Join exact sẽ sót các trang con.
    const matched = [...matchedKeys];
    const codes = new Set<string>();
    for (const lv of linhVucs) {
      if (lv.isActive === false) continue;
      const owns = (lv.menuKeys ?? []).some((k) =>
        matched.some((mk) => this.isPrefix(mk, k)),
      );
      if (owns) codes.add(lv.code);
    }
    if (codes.size === 0) return ['KE_TOAN'];
    return [...codes];
  }

  async getTenantModules(tenantId: string): Promise<string[]> {
    try {
      const cfg = await this.dataSource.getRepository(TenantAppConfig).findOne({ where: { tenantId } as any });
      const mods = cfg?.modules;
      return mods && mods.length ? mods : ['KE_TOAN'];
    } catch {
      return ['KE_TOAN'];
    }
  }

  private isPrefix(fullPath: string, prefix: string): boolean {
    return fullPath === prefix || fullPath.startsWith(prefix + '/');
  }

  private async loadConfig(): Promise<{ menus: MenuCatalog[]; linhVucs: LinhVuc[] }> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < CONFIG_TTL_MS) {
      return { menus: this.cache.menus, linhVucs: this.cache.linhVucs };
    }
    const menus = await this.dataSource.getRepository(MenuCatalog).find();
    const linhVucs = await this.dataSource.getRepository(LinhVuc).find();
    this.cache = { at: now, menus, linhVucs };
    return { menus, linhVucs };
  }
}
