import type { TaiKhoan } from '@/types';

/** Ô chữ theo key cột — trùng `key` trong định nghĩa cột antd của bảng tài khoản. */
export function getTaiKhoanValue(acc: TaiKhoan, key: string): string | undefined {
  switch (key) {
    case 'ma':
      return acc.ma;
    case 'ten':
      return acc.ten;
    default:
      return undefined;
  }
}

/**
 * Lọc cây tài khoản: giữ dòng KHỚP + toàn bộ TÀI KHOẢN CHA của nó (dòng ngữ cảnh).
 *
 * Bảng TK là danh sách phẳng đã sắp lại theo cây (`sortHierarchy`): dòng con chỉ hiện được khi
 * cha của nó còn trong danh sách. Lọc thô (chỉ giữ dòng khớp) làm TK con biến mất kể cả khi
 * chính nó khớp — vì cây mất gốc để duyệt. Vì vậy khi một dòng khớp, ta kéo theo cả tổ tiên.
 *
 * TK cha được giữ chỉ để làm ngữ cảnh: nó KHÔNG kéo theo các con không khớp.
 */
export function keepWithAncestors(
  accounts: TaiKhoan[],
  predicate: (acc: TaiKhoan) => boolean,
): TaiKhoan[] {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const keep = new Set<string>();

  for (const acc of accounts) {
    if (!predicate(acc)) continue;
    keep.add(acc.id);

    // Leo dần lên cha. `seen` chặn lặp vô hạn nếu dữ liệu có parentId trỏ vòng.
    const seen = new Set<string>([acc.id]);
    let parentId = acc.parentId;
    while (parentId && !seen.has(parentId)) {
      seen.add(parentId);
      keep.add(parentId);
      parentId = byId.get(parentId)?.parentId;
    }
  }

  return accounts.filter((a) => keep.has(a.id));
}
