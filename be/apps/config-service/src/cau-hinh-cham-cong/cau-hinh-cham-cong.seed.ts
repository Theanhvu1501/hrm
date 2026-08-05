import type { CauHinhChamCong } from '@app/entities';

/**
 * Mặc định T2–T6 (0=CN … 6=T7).
 *
 * Đây là chỗ GỠ RÀO: vì bản ghi tự sinh từ seed này ở lần đọc đầu tiên, ngay
 * lần Tổng hợp bảng công đầu tiên sau deploy — HR không cần vào màn nào,
 * không cần bấm gì — T7/CN đã hết bị coi là ngày làm việc.
 */
export const CAU_HINH_CHAM_CONG_MAC_DINH: Partial<CauHinhChamCong> = {
  ngayLamViecTrongTuan: [1, 2, 3, 4, 5],
  isActive: true,
};
