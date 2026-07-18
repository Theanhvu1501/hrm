/**
 * Module / Lĩnh vực (entitlement) — DANH MỤC ĐỘNG.
 *
 * Danh sách lĩnh vực và mapping menu→lĩnh vực nay lưu ở DB
 * (collection `linh_vuc`, API `/master-data/linh-vuc`), nạp qua AuthContext.
 * File này chỉ giữ: whitelist icon (DB lưu tên string), menu COMMON,
 * helper tính lĩnh vực khả dụng + hợp nhất menuKeys từ nhiều lĩnh vực.
 */
import React from 'react';
import {
  AccountBookOutlined,
  InboxOutlined,
  AppstoreOutlined,
  ShopOutlined,
  BankOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  TeamOutlined,
} from '@ant-design/icons';

// Whitelist icon AntD cho lĩnh vực (DB lưu tên string).
const ICON_MAP: Record<string, React.ComponentType> = {
  AccountBookOutlined,
  InboxOutlined,
  AppstoreOutlined,
  ShopOutlined,
  BankOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  TeamOutlined,
};

export const ICON_WHITELIST = Object.keys(ICON_MAP);

export const iconByName = (name: string): React.ReactNode =>
  React.createElement(ICON_MAP[name] ?? AppstoreOutlined);

// Menu luôn hiển thị bất kể lĩnh vực.
export const COMMON_MENU_KEYS = new Set<string>([
  '/',
  '/quy-trinh',
  '/chinh-sach',
  '/bieu-mau',
  '/huong-dan',
]);

export const isCommonKey = (key: string): boolean => {
  for (const k of COMMON_MENU_KEYS) {
    if (key === k || key.startsWith(k + '/')) return true;
  }
  return false;
};

/**
 * Code lĩnh vực khả dụng: SuperAdmin = mọi code active; user thường = giao
 * tenantModules ∩ code active. Fallback ['KE_TOAN'] nếu rỗng.
 */
export function getAvailableModuleCodes(
  tenantModules: string[] | undefined,
  isSuperAdmin: boolean,
  allActiveCodes: string[],
): string[] {
  if (isSuperAdmin) return allActiveCodes;
  const codes = (tenantModules ?? ['KE_TOAN']).filter((c) => allActiveCodes.includes(c));
  if (codes.length) return codes;
  return allActiveCodes.includes('KE_TOAN') ? ['KE_TOAN'] : allActiveCodes.slice(0, 1);
}

/** Hợp nhất menuKeys của nhiều phân hệ, loại trùng, giữ thứ tự xuất hiện đầu. */
export function unionMenuKeys(modules: { menuKeys: string[] }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of modules) {
    for (const k of m.menuKeys ?? []) {
      if (!seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    }
  }
  return out;
}

