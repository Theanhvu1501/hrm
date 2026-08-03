import type { DongThemGioTheoLoai } from '@app/entities';

/**
 * Phần tiền làm thêm được MIỄN thuế TNCN.
 *
 * TT 111/2013 Đ3.1.i miễn phần trả CAO HƠN đơn giá giờ ngày thường. Với một
 * loại hệ số `h`, phần chịu thuế là `soGio × donGiaGio × 1.0` còn phần miễn là
 * `soGio × donGiaGio × (h − 1)`.
 *
 * `truMotDonVi` (chế độ `nghi_bu_va_chenh`): hệ số lưu trên bảng ĐÃ là
 * `heSoTra − 1`, nghĩa là toàn bộ khoản trả CHÍNH LÀ phần chênh — miễn hết,
 * không trừ thêm một lần nữa.
 *
 * Kẹp về 0: hệ số ≤ 1 cho phần chênh ÂM, mà số âm ở đây làm cột TN miễn thuế
 * tụt xuống — tức thu THỪA thuế của người lao động.
 */
export function tinhOtMienThue(input: {
  theoLoai: Record<string, DongThemGioTheoLoai>;
  donGiaGio: number;
  mienThueChenh: string[];
  truMotDonVi: boolean;
}): number {
  let tong = 0;
  for (const loai of input.mienThueChenh ?? []) {
    const p = input.theoLoai?.[loai];
    if (!p) continue;
    tong += input.truMotDonVi
      ? Math.max(0, p.thanhTien)
      : Math.max(0, p.soGio * input.donGiaGio * (p.heSo - 1));
  }
  return tong;
}
