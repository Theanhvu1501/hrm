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
      // Nhân với số ngày LÀM ĐỦ (ký hiệu `X`), không phải tổng công quy đổi.
      // Đây là công thức của các khoản theo suất/ngày có mặt (ăn ca, xăng xe):
      // `congThuong` = `soNgayCong` của bảng công tính P/L/NB/CT là 1 công và
      // `1/2` là 0,5 công, nên người nghỉ phép vẫn được suất ăn. Đo trên
      // production 07/2026: NV0004 có X=22 + P=1 ⇒ ăn ca ra 50k×23.
      //
      // `?? dv.congThuong`: dòng lương lưu TRƯỚC bản vá không có `congDayDu`.
      // Cho về 0 là xoá trắng khoản ăn ca khi tính lại một dòng cũ — mất tiền
      // im lặng trên phiếu lương thật, tệ hơn hẳn con số cũ hơi rộng tay.
      // Dòng sẽ tự đúng ở lần Tổng hợp kế tiếp.
      x = (khoan.thamSo.dinhMuc ?? 0) * (dv.congDayDu ?? dv.congThuong);
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
    case 'TIEN_OT':
      // Lấy THẲNG, không nhân lại: bảng 03-LĐTL là nguồn sự thật duy nhất của
      // tiền làm thêm. Dựng lại công thức ở đây là tạo nguồn thứ hai, và hai
      // bên lệch nhau ngay lần đầu kế toán sửa tay một dòng trên bảng đó.
      x = dv.tienOt ?? 0;
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
  const mienThueKhoan = khoanSap
    .filter((k) => k.vaoTongThuNhap)
    .reduce((s, k) => {
      const v = giaTriTungKhoan[k.ma];
      if (!k.chiuThue) return s + v; // cả khoản miễn
      if (k.tranMienThue != null) return s + Math.min(v, k.tranMienThue); // phần ≤ trần miễn
      return s;
    }, 0);

  // Kẹp hai đầu, KHÔNG tin nơi gọi. Vượt `tienOt` làm cột gộp phồng lên, thu
  // nhập tính thuế tụt xuống — trả THIẾU thuế mà bảng vẫn trông hợp lý. Số âm
  // làm cột gộp tụt — thu THỪA thuế của người lao động.
  const otMienThue = Math.min(
    Math.max(0, dv.otMienThue ?? 0),
    Math.max(0, dv.tienOt ?? 0),
  );

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
    // Đọc HAI thành phần gốc, KHÔNG đọc cột gộp: cột gộp có giảm trừ gia cảnh
    // bên trong, mà lao động thời vụ KHÔNG được giảm trừ. Hôm nay `giamTru`
    // trong nhánh này luôn 0 nên đọc nhầm vẫn ra đúng — chính vì vô hại nên
    // nó sẽ không được ai để ý cho tới khi có người cho thời vụ giảm trừ.
    const tnCT = Math.max(0, tongThuNhap - mienThueKhoan - otMienThue);
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
      tongThuNhap - bhxh - (giamTru + mienThueKhoan + otMienThue),
    );
    thue = lamTronTheo(thueLuyTien(thuNhapTinhThue, ch.bacThue), ch.lamTron);
  }

  // Tính SAU thuế, KHÔNG đụng `thuNhapTinhThue`: TT 111/2013 Đ9 liệt kê đủ các
  // khoản được trừ trước thuế (giảm trừ gia cảnh, bảo hiểm bắt buộc, quỹ hưu
  // trí tự nguyện, từ thiện/nhân đạo/khuyến học) — đoàn phí công đoàn KHÔNG
  // nằm trong đó. Trừ nó khỏi thu nhập tính thuế là tính THIẾU thuế TNCN, và
  // sai này chỉ lộ ra lúc quyết toán năm.
  //
  // `?? 0`: cấu hình lưu trước phase này không có trường `phiCongDoan`.
  // `undefined × số` ra `NaN`, mà `NaN` đi qua `lamTronTheo()` vẫn là `NaN`
  // rồi thành `thucLinh = NaN` trên phiếu lương của người thật.
  const phiCongDoan = lamTronTheo(
    (ch.phiCongDoan?.tyLe ?? 0) * baseBHXH,
    ch.lamTron,
  );

  const thucLinh =
    tongThuNhap - bhxh - thue - phiCongDoan - dv.tamUng - dv.khauTruKhac;

  return {
    giaTriTungKhoan,
    tongThuNhap,
    // Cột GỘP để kế toán đọc; hai thành phần gốc trả kèm bên dưới vì tờ khai
    // 05/KK-TNCN cần chúng ở hai dòng khác nhau.
    thuNhapMienThue: giamTru + mienThueKhoan + otMienThue,
    mienThueKhoan,
    otMienThue,
    bhxh,
    giamTru,
    thuNhapTinhThue,
    thue,
    phiCongDoan,
    thucLinh,
    chiPhiBHCongTy,
    tongChiPhiCongTy: tongThuNhap + chiPhiBHCongTy,
  };
}
