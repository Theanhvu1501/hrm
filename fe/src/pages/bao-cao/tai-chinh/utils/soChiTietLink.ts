export interface SoChiTietLinkArgs {
  maTaiKhoan: string;
  maDoiTuong?: string;
  startDate?: string; // ISO
  endDate?: string; // ISO
}

/**
 * Dựng URL sang trang Sổ chi tiết tài khoản, mang theo TK (+ đối tượng) và kỳ.
 * Chỉ thêm maDoiTuong / startDate / endDate khi có giá trị.
 */
export function buildSoChiTietUrl(args: SoChiTietLinkArgs): string {
  const params = new URLSearchParams();
  params.set('maTaiKhoan', args.maTaiKhoan);
  if (args.maDoiTuong) params.set('maDoiTuong', args.maDoiTuong);
  if (args.startDate) params.set('startDate', args.startDate);
  if (args.endDate) params.set('endDate', args.endDate);
  return `/bao-cao/so-chi-tiet-tai-khoan?${params.toString()}`;
}
