export const NHAN_TRANG_THAI_QUY: Record<string, string> = {
  dang_hieu_luc: 'Đang hiệu lực',
  da_dong: 'Đã đóng',
};

export const NHAN_LY_DO: Record<string, string> = {
  cap_dau_nam: 'Cấp đầu năm',
  cap_len_chinh_thuc: 'Cấp khi lên chính thức',
  cap_bu_nam_truoc: 'Cấp bù năm trước',
  duyet_don: 'Duyệt đơn nghỉ',
  huy_don: 'Huỷ/từ chối đơn',
  dieu_chinh_tay: 'HR điều chỉnh tay',
  het_han: 'Hết hạn — đóng quỹ',
  // P3.10: phép cộng dần mỗi lần chốt bảng công, theo công thực tế của tháng.
  tich_theo_thang: 'Tích theo công tháng',
};

export function nhanTrangThaiQuy(x: string): string {
  return NHAN_TRANG_THAI_QUY[x] ?? x;
}

/** Giá trị lạ trả nguyên chuỗi: thà hiện mã còn hơn ô trống không giải thích được. */
export function nhanLyDoBienDong(x: string): string {
  return NHAN_LY_DO[x] ?? x;
}

/** Quỹ còn dư và hạn dùng trong vòng 30 ngày → cảnh báo cho NV kịp nghỉ. */
export function sapHetHan(
  quy: { hanDung: string; soNgayConLai: number },
  homNay: string,
): boolean {
  if (quy.soNgayConLai <= 0) return false;
  if (quy.hanDung < homNay) return false;
  const cach =
    (Date.parse(`${quy.hanDung}T00:00:00Z`) - Date.parse(`${homNay}T00:00:00Z`)) /
    86_400_000;
  return cach <= 30;
}

/**
 * Ô "dự kiến tháng này" (P3.10) — quyết định hiện gì, tách khỏi JSX để test
 * được mà không phải dựng cả CHandler provider.
 *
 * `can` là ngưỡng LÀM TRÒN LÊN: ngưỡng thật là một nửa số ngày làm việc, mà
 * tháng có số ngày làm việc lẻ (21, 27) sẽ ra x,5 — hiện "cần ≥13,5 công"
 * cho một thứ đếm bằng ngày là vô nghĩa với người đọc. Làm tròn lên nên con
 * số hiện ra luôn ĐỦ để đạt ngưỡng, không bao giờ hứa thiếu.
 */
export type ODuKien =
  | { kieu: 'khong_ap_dung' }
  | { kieu: 'da_tich' }
  | { kieu: 'dat'; soNgay: number; congHopLe: number; chuan: number }
  | { kieu: 'chua_dat'; congHopLe: number; chuan: number; can: number };

export function oDuKien(
  d:
    | {
        congHopLe: number;
        soNgayLamViecChuan: number;
        datNguong: boolean;
        soNgayDuKien: number;
        daTich: boolean;
      }
    | undefined,
): ODuKien {
  if (!d) return { kieu: 'khong_ap_dung' };
  if (d.daTich) return { kieu: 'da_tich' };
  if (d.datNguong) {
    return {
      kieu: 'dat',
      soNgay: d.soNgayDuKien,
      congHopLe: d.congHopLe,
      chuan: d.soNgayLamViecChuan,
    };
  }
  return {
    kieu: 'chua_dat',
    congHopLe: d.congHopLe,
    chuan: d.soNgayLamViecChuan,
    can: Math.ceil(d.soNgayLamViecChuan / 2),
  };
}
