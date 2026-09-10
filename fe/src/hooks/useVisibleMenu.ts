import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  MENU_MODULES, leavesOfModule, permKeyOf,
  type MenuLeaf, type MenuModule,
} from '@/config/menuCatalog';

export interface VisibleModule {
  module: MenuModule;
  leaves: MenuLeaf[];
}

/** Khoá quyền xem của một mục. */
export const cacKhoaQuyen = (leaf: MenuLeaf): string[] => [`${permKeyOf(leaf)}:xem`];

/**
 * Lọc theo quyền — đúng như sidebar cũ của nhan-su (`hasPermission(...) || isSuperAdmin`).
 * Khác ke-toan-so: nhan-su không có tầng lọc theo lĩnh vực.
 * Mục `luonHien` (Tổng quan, Chấm công của tôi) không xét quyền — y như sidebar cũ.
 * Mục `soon` bỏ qua tầng quyền — chưa có gì để cấp, ẩn đi thì người dùng
 * không bao giờ biết tính năng đang được làm.
 */
export function locMuc(
  leaves: MenuLeaf[],
  coQuyen: (perm: string) => boolean,
  isSuperAdmin: boolean,
): MenuLeaf[] {
  return leaves.filter((leaf) => {
    if (leaf.legacy) return false;
    if (isSuperAdmin) return true;
    if (leaf.luonHien) return true;
    if (leaf.status === 'soon') return true;
    return cacKhoaQuyen(leaf).some(coQuyen);
  });
}

/**
 * Phân hệ chỉ còn mục `soon` thì ẩn cả phân hệ khi người dùng không xem được
 * mục thật nào — tránh rail toàn ô "sắp có" với người không có quyền gì.
 */
const coMucThat = (leaves: MenuLeaf[]) => leaves.some((l) => l.status === 'ok');

export function useVisibleMenu(): VisibleModule[] {
  const { hasPermission, user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin ?? false;

  return useMemo(() => {
    const ds = MENU_MODULES.map((module) => ({
      module,
      leaves: locMuc(leavesOfModule(module.id), hasPermission, isSuperAdmin),
    })).filter((m) => m.leaves.length > 0);
    // Có ít nhất một phân hệ xem được thật thì mới hiện các phân hệ "sắp có".
    return ds.some((m) => coMucThat(m.leaves)) ? ds : [];
  }, [hasPermission, isSuperAdmin]);
}
