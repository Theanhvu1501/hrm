import { DataSource } from 'typeorm';
import { MenuCatalog } from '@app/entities';

// Map menuKey → apiPrefixes. Đồng bộ fe/src/config/menuCatalog.ts + super({ endpoint }) FE.
// Chỉ liệt kê menu CÓ API thật (ComingSoon để apiPrefixes: []).
export const MENU_CATALOG_SEED: Array<{
  menuKey: string;
  label: string;
  parentLabel?: string;
  apiPrefixes: string[];
}> = [
  // ===== KHO — kho-service =====
  { menuKey: '/kho/nhap-kho', label: 'Nhập kho', parentLabel: 'Kho', apiPrefixes: ['/kho/phieu'] },
  { menuKey: '/kho/xuat-kho', label: 'Xuất kho', parentLabel: 'Kho', apiPrefixes: ['/kho/phieu'] },
  { menuKey: '/kho/chuyen-kho', label: 'Chuyển kho', parentLabel: 'Kho', apiPrefixes: ['/kho/phieu'] },
  // ===== KHO — danh mục (master-data-service) =====
  { menuKey: '/danh-muc/kho', label: 'Kho', parentLabel: 'Danh mục', apiPrefixes: ['/master-data/kho'] },
  { menuKey: '/danh-muc/hang-hoa-vat-tu', label: 'Hàng hóa vật tư', parentLabel: 'Danh mục', apiPrefixes: ['/master-data/hang-hoa-vat-tu'] },
  { menuKey: '/danh-muc/don-vi-tinh', label: 'Đơn vị tính', parentLabel: 'Danh mục', apiPrefixes: ['/master-data/don-vi-tinh'] },
  { menuKey: '/danh-muc/nhom-vat-tu', label: 'Nhóm vật tư', parentLabel: 'Danh mục', apiPrefixes: ['/master-data/nhom-vat-tu'] },
  // ===== KHO — ComingSoon (chưa có API) =====
  { menuKey: '/chung-tu/phieu-nhap', label: 'Phiếu nhập', parentLabel: 'Chứng từ', apiPrefixes: [] },
  { menuKey: '/chung-tu/phieu-xuat', label: 'Phiếu xuất', parentLabel: 'Chứng từ', apiPrefixes: [] },
];

export async function seedMenuCatalog(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(MenuCatalog);
  for (const item of MENU_CATALOG_SEED) {
    const existing = await repo.findOne({ where: { menuKey: item.menuKey } });
    if (existing) {
      existing.label = item.label;
      existing.parentLabel = item.parentLabel ?? (null as any);
      existing.apiPrefixes = item.apiPrefixes;
      await repo.save(existing);
    } else {
      await repo.save(repo.create(item));
    }
  }
}
