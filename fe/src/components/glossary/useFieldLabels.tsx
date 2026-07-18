import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { lookupOverride, tableTermKey } from '@/config/tableTitleConfig';

/**
 * Resolve nhãn field cho form Thêm/Sửa theo CÙNG key với cột bảng
 * (`tbl:<pageKey>:<field>`). Dùng cùng `pageKey` với bảng của trang đó →
 * đổi tên cột bằng ⚙️ thì label form tự ăn theo (khi `field` trùng key cột).
 *
 * Dùng: `const fl = useFieldLabels('danhMuc.khachHang');`
 *       `<Form.Item label={fl('tenKhachHang', 'Tên khách hàng')} ...>`
 */
export function useFieldLabels(pageKey: string) {
  const { currentTenant, currentLinhVuc } = useAuth();
  const tenantG = currentTenant?.glossary;
  const linhVucG = currentLinhVuc?.glossary;

  return useCallback(
    (field: string, def: string): string =>
      lookupOverride(tenantG, linhVucG, tableTermKey(pageKey, field)) ?? def,
    [tenantG, linhVucG, pageKey],
  );
}
