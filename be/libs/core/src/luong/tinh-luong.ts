import {
  CauHinhLuongData,
  DauVaoDongLuong,
  KetQuaLuong,
  KhoanLuong,
  BacThue,
} from '@app/entities';

export function lamTronTheo(x: number, buoc: number): number {
  if (!buoc || buoc <= 0) return x;
  return Math.round(x / buoc) * buoc;
}

/** Thuế lũy tiến từng phần theo danh sách bậc (đã theo `den` tăng dần, bậc cuối den=null). */
export function thueLuyTien(tntt: number, bac: BacThue[]): number {
  if (tntt <= 0) return 0;
  let thue = 0;
  let moc = 0;
  for (const b of bac) {
    const tran = b.den == null ? Infinity : b.den;
    if (tntt > moc) {
      thue += (Math.min(tntt, tran) - moc) * b.suat;
    }
    moc = tran;
    if (tntt <= tran) break;
  }
  return thue;
}

function tinhKhoan(
  khoan: KhoanLuong,
  dv: DauVaoDongLuong,
  ch: CauHinhLuongData,
): number {
  const congChuan = ch.congChuan || 24;
  const tyLeTV = ch.thuViec.tyLe;
  let x = 0;
  switch (khoan.loaiCongThuc) {
    case 'LUONG_THEO_CONG':
      x =
        (dv.base / congChuan) * (dv.congThuong + dv.congKhac) +
        (dv.base / congChuan) * dv.congThuViec * tyLeTV;
      break;
    case 'DINH_MUC_x_CONG':
      x = (khoan.thamSo.dinhMuc ?? 0) * dv.congThuong;
      break;
    case 'CO_DINH_THANG': {
      const soTien =
        khoan.thamSo.nguonHoSo === 'phuCapCoDinh'
          ? dv.phuCapCoDinh
          : khoan.thamSo.soTien ?? 0;
      x =
        (soTien / congChuan) *
        (dv.congThuong + dv.congThuViec * tyLeTV);
      break;
    }
    case 'PHAN_TRAM_BASE':
      x = (khoan.thamSo.tyLe ?? 0) * dv.base;
      break;
    case 'NHAP_THEO_KY':
      x = dv.nhapTheoKy[khoan.ma] ?? 0;
      break;
  }
  return lamTronTheo(x, ch.lamTron);
}

export function tinhDongLuong(
  dv: DauVaoDongLuong,
  ch: CauHinhLuongData,
): KetQuaLuong {
  const khoanSap = [...ch.khoanLuong].sort((a, b) => a.thuTu - b.thuTu);

  const giaTriTungKhoan: Record<string, number> = {};
  for (const k of khoanSap) giaTriTungKhoan[k.ma] = tinhKhoan(k, dv, ch);

  const tongThuNhap = khoanSap
    .filter((k) => k.vaoTongThuNhap)
    .reduce((s, k) => s + giaTriTungKhoan[k.ma], 0);

  // Chỉ xét khoản CÓ trong Tổng thu nhập: khoản không vào thu nhập thì không được
  // trừ khỏi thu nhập tính thuế (nếu không sẽ âm thầm giảm thuế sai).
  const thuNhapMienThue = khoanSap
    .filter((k) => k.vaoTongThuNhap)
    .reduce((s, k) => {
      const v = giaTriTungKhoan[k.ma];
      if (!k.chiuThue) return s + v; // cả khoản miễn
      if (k.tranMienThue != null) return s + Math.min(v, k.tranMienThue); // phần ≤ trần miễn
      return s;
    }, 0);

  // Cơ sở đóng BHXH hiện là lựa chọn `canCu` cố định (MUC_KHAI_BAO | base);
  // KhoanLuong.vaoBHXH chưa được cộng dồn ở đây — dành cho một task sau.
  const baseBHXH =
    ch.bhxh.canCu === 'MUC_KHAI_BAO' ? dv.mucKhaiBao : dv.base;

  // HĐLĐ thứ 2: BHXH/BHYT/BHTN đã đóng ở nơi thứ nhất nên NLĐ không bị trừ
  // tại đây, dù HR có tích `dongBH`.
  const bhxh =
    dv.dongBH && !dv.hopDongThu2
      ? lamTronTheo(ch.bhxh.tyLe * baseBHXH, ch.lamTron)
      : 0;

  // Phần CÔNG TY chịu — không trừ vào `thucLinh`, chỉ để quản trị chi phí.
  // Với HĐLĐ thứ 2, công ty vẫn phải đóng BHTNLĐ-BNN nên tỷ lệ này áp BẤT KỂ
  // `dongBH`: HR sẽ không tích `dongBH` cho người này, mà nghĩa vụ 0,5% thì
  // vẫn còn — buộc theo `dongBH` là làm cờ HĐ thứ 2 mất tác dụng đúng ở ca
  // phổ biến nhất.
  const tyLeBHCongTy = dv.hopDongThu2
    ? ch.bhCongTy.tyLeHopDongThu2
    : dv.dongBH
      ? ch.bhCongTy.tyLe
      : 0;
  const chiPhiBHCongTy = lamTronTheo(tyLeBHCongTy * baseBHXH, ch.lamTron);

  let thue = 0;
  let giamTru = 0;
  let thuNhapTinhThue = 0;
  if (dv.camKet && ch.quyTacCamKet.mienThue) {
    thue = 0;
  } else if (dv.thoiVu) {
    const tnCT = Math.max(0, tongThuNhap - thuNhapMienThue);
    thue =
      tnCT >= ch.quyTacThoiVu.nguong
        ? lamTronTheo(ch.quyTacThoiVu.tyLe * tnCT, ch.lamTron)
        : 0;
  } else {
    // HĐLĐ thứ 2: giảm trừ gia cảnh chỉ được đăng ký ở MỘT nơi — đã dùng ở
    // công ty thứ nhất, nên tại đây giảm trừ = 0 nhưng vẫn chạy lũy tiến.
    giamTru = dv.hopDongThu2
      ? 0
      : ch.giamTruBanThan + dv.soNguoiPhuThuoc * ch.giamTruNPT;
    thuNhapTinhThue = Math.max(
      0,
      tongThuNhap - thuNhapMienThue - bhxh - giamTru,
    );
    thue = lamTronTheo(thueLuyTien(thuNhapTinhThue, ch.bacThue), ch.lamTron);
  }

  const thucLinh = tongThuNhap - bhxh - thue - dv.tamUng - dv.khauTruKhac;

  return {
    giaTriTungKhoan,
    tongThuNhap,
    thuNhapMienThue,
    bhxh,
    giamTru,
    thuNhapTinhThue,
    thue,
    thucLinh,
    chiPhiBHCongTy,
    tongChiPhiCongTy: tongThuNhap + chiPhiBHCongTy,
  };
}
