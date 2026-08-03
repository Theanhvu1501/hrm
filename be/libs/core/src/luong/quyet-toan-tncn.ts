import type { BacThue, CauHinhLuongData, DongLuong } from '@app/entities';
import { lamTronTheo, thueLuyTien } from './tinh-luong';

/** Một cột nhóm trên bảng quyết toán — dùng cho cả 4 quý lẫn cả năm. */
export interface KyQuyetToan {
  tongThuNhapChiuThue: number;
  bhxh: number;
  /** Ăn ca dưới trần + phần chênh tiền làm thêm ca đêm. */
  khoanMienThue: number;
  giamTruBanThan: number;
  giamTruNPT: number;
  giamTruGiaCanh: number;
  thuNhapTinhThue: number;
  thue: number;
}

export interface QuyetToanNguoi {
  employeeId: string;
  hoTen: string;
  maNhanVien: string;
  soKyDaChot: number;
  caNam: KyQuyetToan;
  quy: [KyQuyetToan, KyQuyetToan, KyQuyetToan, KyQuyetToan];
  /** Σ thuế đã khấu trừ 12 tháng. */
  daKhauTru: number;
  /** `caNam.thue − daKhauTru`. Dương = nộp thêm, âm = được hoàn. */
  chenhLech: number;
  ghiChu?: string;
}

/**
 * Biểu thuế NĂM = biểu tháng × 12.
 *
 * Đúng vì biểu lũy tiến từng phần của VN được định nghĩa theo năm, và biểu
 * tháng chính là biểu năm chia 12 (TT 111/2013 Phụ lục 01). Bậc cuối `null`
 * (vô hạn) giữ nguyên.
 */
export function dungBacThueNam(bacThang: BacThue[]): BacThue[] {
  return (bacThang ?? []).map((b) => ({
    den: b.den == null ? null : b.den * 12,
    suat: b.suat,
  }));
}

function kyRong(): KyQuyetToan {
  return {
    tongThuNhapChiuThue: 0,
    bhxh: 0,
    khoanMienThue: 0,
    giamTruBanThan: 0,
    giamTruNPT: 0,
    giamTruGiaCanh: 0,
    thuNhapTinhThue: 0,
    thue: 0,
  };
}

/**
 * Quyết toán thuế TNCN cả năm cho MỘT người.
 *
 * ĐIỂM CỐT LÕI — thuế năm KHÔNG phải tổng thuế 12 tháng. Thuế khấu trừ hàng
 * tháng tính trên thu nhập của riêng tháng đó; thu nhập không đều (thưởng Tết,
 * tháng nghỉ, vào làm giữa năm) làm tổng 12 lần khấu trừ lệch với số thuế thật
 * của cả năm. Đó chính là lý do quyết toán tồn tại. Ở đây tính LẠI trên biểu
 * thuế NĂM rồi so với số đã khấu trừ.
 *
 * Bốn nhóm quý thì ngược lại: CỘNG THẲNG con số của các tháng trong quý, không
 * tính lại. Chúng phục vụ đối chiếu với tờ khai quý 05/KK-TNCN đã nộp — tính
 * lại là làm mất chính mục đích đối chiếu.
 *
 * Giảm trừ theo SỐ THÁNG CÓ THU NHẬP chứ không 12 cứng (TT 111/2013 Đ9.1), và
 * số người phụ thuộc cộng theo TỪNG THÁNG — người đăng ký thêm con giữa năm
 * chỉ được giảm trừ từ tháng đăng ký.
 */
export function quyetToanMotNguoi(
  dsDong: DongLuong[],
  ch: CauHinhLuongData,
): QuyetToanNguoi {
  // Chỉ kỳ ĐÃ CHỐT: kỳ nháp còn sửa được, đưa vào quyết toán là đem một con số
  // chưa chốt đi nộp thuế.
  const ds = (dsDong ?? []).filter((d) => d.trangThai === 'chot');
  const dau: any = ds[0] ?? dsDong?.[0] ?? {};

  const caNam = kyRong();
  const quy: [KyQuyetToan, KyQuyetToan, KyQuyetToan, KyQuyetToan] = [
    kyRong(),
    kyRong(),
    kyRong(),
    kyRong(),
  ];
  let daKhauTru = 0;
  let coThoiVu = false;
  let hopDongThu2 = false;

  for (const d of ds) {
    const t: any = d.thucTe ?? {};
    const mien = (t.mienThueKhoan ?? 0) + (t.otMienThue ?? 0);
    // Cột "Tổng thu nhập chịu thuế" trên sheet đứng cạnh cột "Ăn ca"; hiểu nó
    // là `tongThuNhap` thô rồi trừ ăn ca ở bước sau là trừ HAI LẦN.
    const chiuThue = (t.tongThuNhap ?? 0) - mien;
    const thang = Number((d.thang ?? '').split('-')[1]) || 0;
    const iQuy = Math.min(3, Math.max(0, Math.ceil(thang / 3) - 1));

    if (d.thoiVu) coThoiVu = true;
    if (d.hopDongThu2) hopDongThu2 = true;

    // HĐLĐ thứ 2: giảm trừ đã đăng ký ở nơi thứ nhất — đúng như engine tháng.
    const gtBanThan = d.hopDongThu2 ? 0 : ch.giamTruBanThan;
    const gtNPT = d.hopDongThu2
      ? 0
      : (d.soNguoiPhuThuoc ?? 0) * ch.giamTruNPT;

    for (const k of [caNam, quy[iQuy]]) {
      k.tongThuNhapChiuThue += chiuThue;
      k.bhxh += t.bhxh ?? 0;
      k.khoanMienThue += mien;
      k.giamTruBanThan += gtBanThan;
      k.giamTruNPT += gtNPT;
      k.giamTruGiaCanh += gtBanThan + gtNPT;
      k.thue += t.thue ?? 0; // quý: số ĐÃ khấu trừ, cộng thẳng
    }
    quy[iQuy].thuNhapTinhThue += t.thuNhapTinhThue ?? 0;
    daKhauTru += t.thue ?? 0;
  }

  // ── Cả năm: TÍNH LẠI, không cộng ────────────────────────────────────────
  caNam.thuNhapTinhThue = Math.max(
    0,
    caNam.tongThuNhapChiuThue - caNam.bhxh - caNam.giamTruGiaCanh,
  );
  caNam.thue = lamTronTheo(
    thueLuyTien(caNam.thuNhapTinhThue, dungBacThueNam(ch.bacThue)),
    ch.lamTron,
  );

  const ghiChu = [
    hopDongThu2 ? 'HĐLĐ thứ 2 — không giảm trừ tại đây' : '',
    coThoiVu ? 'có tháng thời vụ trong năm' : '',
  ]
    .filter(Boolean)
    .join('; ');

  return {
    employeeId: String(dau.employeeId ?? ''),
    hoTen: dau.employeeName ?? '',
    maNhanVien: dau.employeeCode ?? '',
    soKyDaChot: ds.length,
    caNam,
    quy,
    daKhauTru,
    chenhLech: caNam.thue - daKhauTru,
    ghiChu: ghiChu || undefined,
  };
}
