import type { DongThemGioTheoLoai } from '@app/entities';

export interface DauVaoThemGio {
  luongThang: number;
  congChuan: number;
  soGioMoiNgay: number;
  /** Giờ TRẢ TIỀN theo loại — đã lọc theo `cheDoBu` ở tầng service. */
  gioTheoLoai: Record<string, number>;
  heSoTra: Record<string, number>;
  /** `cheDoBu = 'nghi_bu_va_chenh'`: chỉ trả phần vượt 1.0. */
  truMotDonVi: boolean;
}

export interface KetQuaThemGio {
  donGiaNgay: number;
  donGiaGio: number;
  theoLoai: Record<string, DongThemGioTheoLoai>;
  tongTien: number;
}

/**
 * Tiền làm thêm của MỘT nhân viên trong MỘT kỳ, tách theo loại ngày.
 *
 * Công thức đơn giá khớp đúng dòng dữ liệu thật trong sheet `LÀM THÊM GIỜ`:
 * 5.500.000 / 24 = 229.166,67 (mức lương ngày) / 8 = 28.645,83 (mức lương
 * giờ), 35 giờ × 28.645,83 × 1,5 = 1.503.906,25.
 *
 * KHÔNG làm tròn — mẫu 03-LĐTL in tới phần thập phân. Làm tròn chỉ xảy ra khi
 * con số này thành khoản `TIEN_OT` của bảng lương chính (P4.2c-2).
 *
 * Hai chỗ phòng thủ, cả hai đều là số ĐI THẲNG RA PHIẾU LƯƠNG nếu để lọt:
 *  - Mẫu số 0 trả đơn giá 0 chứ không `Infinity` — `congChuan`/`soGioMoiNgay`
 *    là cấu hình do người dùng nhập.
 *  - Loại không có trong bảng hệ số cho hệ số 0 chứ không `undefined` —
 *    `undefined` nhân ra `NaN`, mà `NaN` cộng dồn vẫn là `NaN` rồi nằm im
 *    trong DB.
 */
export function tinhDongThemGio(dv: DauVaoThemGio): KetQuaThemGio {
  const donGiaNgay = dv.congChuan > 0 ? dv.luongThang / dv.congChuan : 0;
  const donGiaGio = dv.soGioMoiNgay > 0 ? donGiaNgay / dv.soGioMoiNgay : 0;

  const theoLoai: Record<string, DongThemGioTheoLoai> = {};
  let tongTien = 0;

  for (const [loai, soGio] of Object.entries(dv.gioTheoLoai)) {
    const heSoGoc = dv.heSoTra[loai] ?? 0;
    // `Math.max(0, …)`: hệ số cấu hình < 1 (DTO chỉ chặn ≤ 0) sẽ cho hệ số áp
    // ÂM ở chế độ trả chênh — tức TRỪ tiền của người lao động vì họ làm thêm.
    const heSo = dv.truMotDonVi ? Math.max(0, heSoGoc - 1) : heSoGoc;
    const thanhTien = soGio * donGiaGio * heSo;
    theoLoai[loai] = { soGio, heSo, thanhTien };
    tongTien += thanhTien;
  }

  return { donGiaNgay, donGiaGio, theoLoai, tongTien };
}
