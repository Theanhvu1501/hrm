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
