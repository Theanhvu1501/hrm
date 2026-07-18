import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { PhieuKho } from '@/types';
import { printKhoPhieu } from './printKhoPhieu';
import { getDefaultKhoTemplate } from './khoPrintTemplates';

/**
 * Hook trả về hàm in phiếu kho. Tên công ty lấy từ currentTenant.
 * Truyền `template` (mẫu đã lưu) để in theo mẫu cấu hình; rỗng thì dùng mẫu mặc định.
 */
export function usePrintKhoPhieu() {
  const { currentTenant } = useAuth();
  return useCallback(
    (phieu: PhieuKho, template?: string | null) => {
      printKhoPhieu(phieu, template || getDefaultKhoTemplate(phieu.loaiPhieu), {
        tenCongTy: currentTenant?.tenantName ?? '',
        diaChiCongTy: '',
      });
    },
    [currentTenant],
  );
}
