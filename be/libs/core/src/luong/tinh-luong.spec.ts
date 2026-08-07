import { tinhDongLuong, thueLuyTien, lamTronTheo } from './tinh-luong';
import { CauHinhLuongData, DauVaoDongLuong } from '@app/entities';

const BAC_MAC_DINH = [
  { den: 10_000_000, suat: 0.05 },
  { den: 30_000_000, suat: 0.1 },
  { den: 60_000_000, suat: 0.2 },
  { den: 100_000_000, suat: 0.3 },
  { den: null, suat: 0.35 },
];

function cauHinh(over: Partial<CauHinhLuongData> = {}): CauHinhLuongData {
  return {
    mucKhaiBaoMacDinh: 5_500_000,
    congChuan: 24,
    khoanLuong: [
      { ma: 'LUONG_CONG', ten: 'Lương theo công', loaiCongThuc: 'LUONG_THEO_CONG', thamSo: {}, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: true, thuTu: 1 },
      { ma: 'AN_CA', ten: 'Ăn ca', loaiCongThuc: 'DINH_MUC_x_CONG', thamSo: { dinhMuc: 50_000 }, chiuThue: true, tranMienThue: 1_200_000, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 2 },
      { ma: 'HIEU_SUAT', ten: 'Hiệu suất', loaiCongThuc: 'NHAP_THEO_KY', thamSo: {}, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 3 },
    ],
    giamTruBanThan: 15_500_000,
    giamTruNPT: 6_200_000,
    bhxh: { tyLe: 0.105, canCu: 'MUC_KHAI_BAO' },
    bacThue: BAC_MAC_DINH,
    thuViec: { tyLe: 0.85 },
    quyTacThoiVu: { tyLe: 0.1, nguong: 2_000_000 },
    quyTacCamKet: { mienThue: true },
    bhCongTy: { tyLe: 0.215, tyLeHopDongThu2: 0.005 },
    // Mặc định 0 để mọi bài test cũ giữ nguyên con số; bài nào cần thì override.
    phiCongDoan: { tyLe: 0 },
    lamTron: 1000,
    // `tinhDongLuong()` không đọc hai trường này, khai cho đủ kiểu.
    soGioMoiNgay: 8,
    lamThem: {
      cheDoBu: 'chi_nghi_bu',
      heSoTra: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3, ngay_dem: 1.5 },
      heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3, ngay_dem: 1.5 },
      khungGioDem: { tu: '22:00', den: '06:00' },
      uuTienLoai: ['ngay_le', 'ngay_nghi', 'ngay_dem', 'ngay_thuong'],
      mienThueChenh: ['ngay_dem'],
      soThangHanDung: null,
      khiHetHan: 'quy_ra_tien',
    },
    ...over,
  };
}

function dauVao(over: Partial<DauVaoDongLuong> = {}): DauVaoDongLuong {
  return {
    base: 5_500_000, mucKhaiBao: 5_500_000,
    congThuong: 24, congThuViec: 0, congKhac: 0,
    // Số ngày ký hiệu X. Mặc định bằng congThuong để mọi bài cũ giữ nguyên
    // số; bài nào cần tách hai con số thì override.
    congDayDu: 24,
    phuCapCoDinh: 0, soNguoiPhuThuoc: 0, tamUng: 0, khauTruKhac: 0,
    dongBH: false, thoiVu: false, camKet: false, hopDongThu2: false,
    nhapTheoKy: {},
    // P4.2c-2: mặc định 0 để mọi bài cũ giữ nguyên số; bài nào cần thì override.
    tienOt: 0, otMienThue: 0,
    ...over,
  };
}

describe('lamTronTheo', () => {
  it('làm tròn tới nghìn gần nhất', () => {
    expect(lamTronTheo(1_234_500, 1000)).toBe(1_235_000);
    expect(lamTronTheo(1_234_400, 1000)).toBe(1_234_000);
  });
});

describe('thueLuyTien — theo bậc CẤU HÌNH, không số cứng', () => {
  it('bậc mặc định: đúng biên', () => {
    expect(thueLuyTien(0, BAC_MAC_DINH)).toBe(0);
    expect(thueLuyTien(10_000_000, BAC_MAC_DINH)).toBe(500_000); // 10tr×5%
    expect(thueLuyTien(30_000_000, BAC_MAC_DINH)).toBe(500_000 + 2_000_000); // +20tr×10%
    expect(thueLuyTien(60_000_000, BAC_MAC_DINH)).toBe(500_000 + 2_000_000 + 6_000_000); // +30tr×20%
  });
  it('bộ bậc KHÁC → kết quả khác (chứng minh đọc cấu hình)', () => {
    const bac2 = [{ den: 5_000_000, suat: 0.1 }, { den: null, suat: 0.2 }];
    expect(thueLuyTien(5_000_000, bac2)).toBe(500_000);
    expect(thueLuyTien(10_000_000, bac2)).toBe(500_000 + 1_000_000); // +5tr×20%
  });
});

describe('tinhDongLuong', () => {
  it('lương theo công full tháng, không phụ cấp, không thuế (dưới giảm trừ)', () => {
    const r = tinhDongLuong(dauVao(), cauHinh());
    expect(r.giaTriTungKhoan.LUONG_CONG).toBe(5_500_000);
    expect(r.giaTriTungKhoan.AN_CA).toBe(1_200_000); // 50k×24
    expect(r.tongThuNhap).toBe(6_700_000);
    expect(r.thue).toBe(0); // dưới giảm trừ bản thân
    expect(r.thucLinh).toBe(6_700_000);
  });

  it('thử việc hưởng 85%', () => {
    const r = tinhDongLuong(dauVao({ congThuong: 0, congThuViec: 24 }), cauHinh());
    expect(r.giaTriTungKhoan.LUONG_CONG).toBe(lamTronTheo(5_500_000 / 24 * 24 * 0.85, 1000));
  });

  it('ăn ca vượt trần 1.2tr: phần vượt chịu thuế', () => {
    // base cao để phát sinh thuế; đặt ăn ca dinhMuc lớn
    const ch = cauHinh();
    const r = tinhDongLuong(dauVao({ base: 15_000_000 }), ch);
    // ăn ca = 50k×24 = 1.2tr = đúng trần → miễn toàn bộ
    expect(r.giaTriTungKhoan.AN_CA).toBe(1_200_000);
    expect(r.mienThueKhoan).toBe(1_200_000); // (không đóng BH nên chỉ ăn ca miễn)
  });

  it('BHXH theo MỨC KHAI BÁO ở cả 2 mức (dongBH)', () => {
    const rThucTe = tinhDongLuong(dauVao({ base: 15_000_000, mucKhaiBao: 5_500_000, dongBH: true }), cauHinh());
    expect(rThucTe.bhxh).toBe(lamTronTheo(0.105 * 5_500_000, 1000)); // theo 5.5tr, KHÔNG theo 15tr
  });

  it('cam kết → thuế 0', () => {
    const r = tinhDongLuong(dauVao({ base: 50_000_000, camKet: true }), cauHinh());
    expect(r.thue).toBe(0);
  });

  it('thời vụ → 10% nếu ≥ ngưỡng, dưới ngưỡng → 0', () => {
    const r = tinhDongLuong(dauVao({ base: 10_000_000, thoiVu: true }), cauHinh());
    const tnCT = r.tongThuNhap - r.mienThueKhoan - r.otMienThue;
    expect(r.thue).toBe(lamTronTheo(0.1 * tnCT, 1000));
    // Đối chiếu bằng số tính tay độc lập, không lấy lại từ r.tongThuNhap/r.thuNhapMienThue:
    // LUONG_CONG = (10tr/24)*24 = 10tr; AN_CA = 50k×24 = 1.2tr (= trần → miễn hết);
    // HIEU_SUAT = 0 (không nhập theo kỳ) → tongThuNhap = 11.2tr, thuNhapMienThue = 1.2tr
    // → tnCT = 10tr (≥ ngưỡng 2tr) → thuế = 10% × 10tr = 1.000.000đ.
    expect(r.thue).toBe(1_000_000);
    const nho = tinhDongLuong(dauVao({ base: 1_000_000, congThuong: 4, thoiVu: true }), cauHinh());
    expect(nho.thue).toBe(0); // dưới 2tr
  });

  it('người phụ thuộc giảm thu nhập tính thuế', () => {
    const r0 = tinhDongLuong(dauVao({ base: 40_000_000, soNguoiPhuThuoc: 0 }), cauHinh());
    const r2 = tinhDongLuong(dauVao({ base: 40_000_000, soNguoiPhuThuoc: 2 }), cauHinh());
    expect(r2.giamTru).toBe(15_500_000 + 2 * 6_200_000);
    expect(r2.thuNhapTinhThue).toBeLessThan(r0.thuNhapTinhThue);
  });

  it('thêm một khoản NHAP_THEO_KY → tổng thu nhập tăng đúng', () => {
    const r = tinhDongLuong(dauVao({ nhapTheoKy: { HIEU_SUAT: 3_000_000 } }), cauHinh());
    expect(r.giaTriTungKhoan.HIEU_SUAT).toBe(3_000_000);
    expect(r.tongThuNhap).toBe(6_700_000 + 3_000_000);
  });

  it('ăn ca VƯỢT trần thật (giá trị > tranMienThue): chỉ phần trần được miễn, phần vượt chịu thuế', () => {
    // congDayDu=30 → AN_CA = 50k×30 = 1.500.000 > trần 1.200.000
    const r = tinhDongLuong(dauVao({ congThuong: 30, congDayDu: 30 }), cauHinh());
    expect(r.giaTriTungKhoan.AN_CA).toBe(1_500_000); // giá trị thực của khoản, KHÔNG bị cắt
    // base thấp, không đóng BH → chỉ ăn ca đóng góp vào thuNhapMienThue, và bị chặn ở trần
    expect(r.mienThueKhoan).toBe(1_200_000); // phần vượt 300.000 KHÔNG được miễn
  });

  it('tắt chiuThue của ăn ca → không cộng vào thu nhập miễn kiểu "trần" mà miễn cả khoản', () => {
    const ch = cauHinh();
    ch.khoanLuong[1].chiuThue = false; // ăn ca không chịu thuế
    const r = tinhDongLuong(dauVao({ base: 15_000_000 }), ch);
    expect(r.mienThueKhoan).toBe(1_200_000); // cả khoản ăn ca (=1.2tr) miễn
  });
});

describe('chi phí BH công ty', () => {
  it('có đóng BH, HĐ thường → tỷ lệ chuẩn trên căn cứ đóng', () => {
    const r = tinhDongLuong(dauVao({ dongBH: true }), cauHinh());
    expect(r.chiPhiBHCongTy).toBe(lamTronTheo(0.215 * 5_500_000, 1000));
  });

  it('không đóng BH, HĐ thường → 0', () => {
    expect(tinhDongLuong(dauVao({ dongBH: false }), cauHinh()).chiPhiBHCongTy).toBe(0);
  });

  it('HĐLĐ thứ 2 → chỉ tỷ lệ BHTNLĐ-BNN, BẤT KỂ dongBH', () => {
    const mong = lamTronTheo(0.005 * 5_500_000, 1000);
    expect(
      tinhDongLuong(dauVao({ hopDongThu2: true, dongBH: true }), cauHinh()).chiPhiBHCongTy,
    ).toBe(mong);
    expect(
      tinhDongLuong(dauVao({ hopDongThu2: true, dongBH: false }), cauHinh()).chiPhiBHCongTy,
    ).toBe(mong);
  });

  it('đọc tỷ lệ từ CẤU HÌNH, không số cứng', () => {
    const ch = cauHinh({ bhCongTy: { tyLe: 0.3, tyLeHopDongThu2: 0.01 } });
    expect(tinhDongLuong(dauVao({ dongBH: true }), ch).chiPhiBHCongTy).toBe(
      lamTronTheo(0.3 * 5_500_000, 1000),
    );
    expect(tinhDongLuong(dauVao({ hopDongThu2: true }), ch).chiPhiBHCongTy).toBe(
      lamTronTheo(0.01 * 5_500_000, 1000),
    );
  });

  it('theo căn cứ LUONG_THOA_THUAN thì tính trên base', () => {
    const ch = cauHinh({ bhxh: { tyLe: 0.105, canCu: 'LUONG_THOA_THUAN' } });
    const r = tinhDongLuong(dauVao({ base: 20_000_000, dongBH: true }), ch);
    expect(r.chiPhiBHCongTy).toBe(lamTronTheo(0.215 * 20_000_000, 1000));
  });

  it('tongChiPhiCongTy = tongThuNhap + chiPhiBHCongTy', () => {
    const r = tinhDongLuong(dauVao({ dongBH: true }), cauHinh());
    expect(r.tongChiPhiCongTy).toBe(r.tongThuNhap + r.chiPhiBHCongTy);
  });

  it('không làm đổi thucLinh (hồi quy)', () => {
    const dv = dauVao({ dongBH: true });
    const r = tinhDongLuong(dv, cauHinh());
    expect(r.thucLinh).toBe(
      r.tongThuNhap - r.bhxh - r.thue - dv.tamUng - dv.khauTruKhac,
    );
  });
});

describe('HĐLĐ thứ 2', () => {
  it('không trừ BHXH của NLĐ dù dongBH = true', () => {
    const r = tinhDongLuong(dauVao({ hopDongThu2: true, dongBH: true }), cauHinh());
    expect(r.bhxh).toBe(0);
  });

  it('không giảm trừ gia cảnh, vẫn chạy bậc thuế lũy tiến', () => {
    const dv = dauVao({
      base: 30_000_000,
      hopDongThu2: true,
      soNguoiPhuThuoc: 2,
      congThuong: 24,
    });
    const r = tinhDongLuong(dv, cauHinh());

    expect(r.giamTru).toBe(0);
    expect(r.thuNhapTinhThue).toBe(r.tongThuNhap - r.mienThueKhoan - r.otMienThue);
    expect(r.thue).toBe(lamTronTheo(thueLuyTien(r.thuNhapTinhThue, BAC_MAC_DINH), 1000));
    expect(r.thue).toBeGreaterThan(0);
  });

  it('camKet thắng hopDongThu2 → thuế 0', () => {
    const r = tinhDongLuong(
      dauVao({ base: 30_000_000, hopDongThu2: true, camKet: true }),
      cauHinh(),
    );
    expect(r.thue).toBe(0);
  });

  it('thoiVu thắng hopDongThu2 → khấu trừ theo quyTacThoiVu, không lũy tiến', () => {
    const r = tinhDongLuong(
      dauVao({ base: 30_000_000, hopDongThu2: true, thoiVu: true }),
      cauHinh(),
    );
    const tnCT = r.tongThuNhap - r.mienThueKhoan - r.otMienThue;
    expect(r.thue).toBe(lamTronTheo(0.1 * tnCT, 1000));
    expect(r.giamTru).toBe(0);
  });

  it('HĐ thường (mặc định) không đổi hành vi cũ', () => {
    const r = tinhDongLuong(
      dauVao({ base: 30_000_000, dongBH: true, soNguoiPhuThuoc: 1 }),
      cauHinh(),
    );
    expect(r.giamTru).toBe(15_500_000 + 6_200_000);
    expect(r.bhxh).toBe(lamTronTheo(0.105 * 5_500_000, 1000));
  });
});

describe('phí công đoàn (P4.2c-2)', () => {
  it('tyLe = 0 thì mọi con số cũ GIỮ NGUYÊN — không đổi lương của ai', () => {
    // Bài hồi quy quan trọng nhất của task: công ty chưa khai phí công đoàn
    // (hoặc khai 0) phải ra đúng bảng lương như trước khi có phase này.
    const dv = dauVao({ tamUng: 500_000, khauTruKhac: 200_000 });
    const r = tinhDongLuong(dv, cauHinh({ phiCongDoan: { tyLe: 0 } }));

    expect(r.phiCongDoan).toBe(0);
    expect(r.thucLinh).toBe(
      r.tongThuNhap - r.bhxh - r.thue - dv.tamUng - dv.khauTruKhac,
    );
  });

  it('2% tính trên CÙNG căn cứ với BHXH', () => {
    const r = tinhDongLuong(
      dauVao({ mucKhaiBao: 10_000_000 }),
      cauHinh({ phiCongDoan: { tyLe: 0.02 } }),
    );

    // canCu mặc định là MUC_KHAI_BAO ⇒ 2% × 10.000.000 = 200.000.
    expect(r.phiCongDoan).toBe(200_000);
  });

  it('KHÔNG làm giảm thu nhập tính thuế — TT 111/2013 Đ9 không liệt kê đoàn phí', () => {
    const khong = tinhDongLuong(dauVao(), cauHinh({ phiCongDoan: { tyLe: 0 } }));
    const co = tinhDongLuong(dauVao(), cauHinh({ phiCongDoan: { tyLe: 0.02 } }));

    // Tính thuế TRƯỚC, trừ phí công đoàn SAU. Làm ngược là tính thiếu thuế
    // TNCN và chỉ lộ ra lúc quyết toán năm.
    expect(co.thuNhapTinhThue).toBe(khong.thuNhapTinhThue);
    expect(co.thue).toBe(khong.thue);
  });

  it('trừ vào thực lĩnh', () => {
    const khong = tinhDongLuong(dauVao(), cauHinh({ phiCongDoan: { tyLe: 0 } }));
    const co = tinhDongLuong(dauVao(), cauHinh({ phiCongDoan: { tyLe: 0.02 } }));

    expect(co.thucLinh).toBe(khong.thucLinh - co.phiCongDoan);
  });

  it('KHÔNG cộng vào chi phí công ty — đây là tiền NLĐ trả, không phải công ty', () => {
    const r = tinhDongLuong(dauVao(), cauHinh({ phiCongDoan: { tyLe: 0.02 } }));

    expect(r.tongChiPhiCongTy).toBe(r.tongThuNhap + r.chiPhiBHCongTy);
  });

  it('cấu hình thiếu phiCongDoan (bản ghi cũ) rơi về 0, KHÔNG NaN', () => {
    const ch = cauHinh() as any;
    delete ch.phiCongDoan;

    const r = tinhDongLuong(dauVao(), ch);
    expect(r.phiCongDoan).toBe(0);
    expect(Number.isNaN(r.thucLinh)).toBe(false);
  });
});

describe('TIEN_OT và TN miễn thuế gộp (P4.2c-2)', () => {
  const chOt = (over: Partial<CauHinhLuongData> = {}) =>
    cauHinh({
      khoanLuong: [
        ...cauHinh().khoanLuong,
        {
          ma: 'TIEN_OT', ten: 'Tiền làm thêm', loaiCongThuc: 'TIEN_OT',
          thamSo: {}, chiuThue: true, tranMienThue: null,
          vaoTongThuNhap: true, vaoBHXH: false, thuTu: 9,
        },
      ],
      ...over,
    });

  it('HỒI QUY: tienOt = 0 thì thu nhập tính thuế vẫn theo đúng công thức cũ', () => {
    // Bài quan trọng nhất: đổi NGHĨA cột không được đổi SỐ THUẾ của ai.
    const r = tinhDongLuong(dauVao({ tienOt: 0, otMienThue: 0 }), cauHinh());

    expect(r.thuNhapTinhThue).toBe(
      Math.max(0, r.tongThuNhap - r.mienThueKhoan - r.bhxh - r.giamTru),
    );
  });

  it('thuNhapMienThue là cột GỘP = giảm trừ + khoản miễn + chênh OT', () => {
    const r = tinhDongLuong(
      dauVao({ tienOt: 1_000_000, otMienThue: 300_000 }),
      chOt(),
    );

    expect(r.thuNhapMienThue).toBe(r.giamTru + r.mienThueKhoan + r.otMienThue);
    expect(r.otMienThue).toBe(300_000);
  });

  it('TN tính thuế = Tổng TN − BHXH − TN miễn thuế (gộp)', () => {
    const r = tinhDongLuong(
      dauVao({ tienOt: 1_000_000, otMienThue: 300_000 }),
      chOt(),
    );

    expect(r.thuNhapTinhThue).toBe(
      Math.max(0, r.tongThuNhap - r.bhxh - r.thuNhapMienThue),
    );
  });

  it('khoản TIEN_OT lấy thẳng dv.tienOt, có làm tròn theo cấu hình', () => {
    const r = tinhDongLuong(
      dauVao({ tienOt: 1_503_906.25, otMienThue: 0 }),
      chOt({ lamTron: 1000 }),
    );

    // Bảng 03-LĐTL giữ phần thập phân; bảng lương chính làm tròn theo `lamTron`.
    expect(r.giaTriTungKhoan.TIEN_OT).toBe(1_504_000);
  });

  it('BẪY THỜI VỤ: lao động thời vụ KHÔNG được giảm trừ gia cảnh chui', () => {
    // Nhánh thời vụ tính trên `tongThuNhap − mienThueKhoan − otMienThue`. Nếu
    // nó đọc trúng cột GỘP (có giảm trừ gia cảnh bên trong) thì thuế 10% tính
    // thiếu — và hôm nay bug đó VÔ HẠI vì giamTru trong nhánh này luôn 0, nên
    // sẽ không ai để ý.
    const ch = chOt();
    const r = tinhDongLuong(
      dauVao({ thoiVu: true, tienOt: 0, otMienThue: 0 }),
      ch,
    );

    const tnCT = Math.max(0, r.tongThuNhap - r.mienThueKhoan - r.otMienThue);
    expect(r.thue).toBe(
      tnCT >= ch.quyTacThoiVu.nguong
        ? lamTronTheo(ch.quyTacThoiVu.tyLe * tnCT, ch.lamTron)
        : 0,
    );
    expect(r.giamTru).toBe(0);
  });

  it('HĐLĐ thứ 2: giảm trừ = 0 nên cột gộp chỉ còn khoản miễn + chênh OT', () => {
    const r = tinhDongLuong(
      dauVao({ hopDongThu2: true, tienOt: 500_000, otMienThue: 200_000 }),
      chOt(),
    );

    expect(r.giamTru).toBe(0);
    expect(r.thuNhapMienThue).toBe(r.mienThueKhoan + 200_000);
  });

  it('otMienThue KHÔNG vượt quá tienOt — cột gộp không phồng quá thực tế', () => {
    // Chặn ở engine chứ không tin nơi gọi: cột gộp phồng lên làm thu nhập tính
    // thuế tụt xuống, tức trả THIẾU thuế mà bảng vẫn trông hợp lý.
    const r = tinhDongLuong(
      dauVao({ tienOt: 100_000, otMienThue: 500_000 }),
      chOt(),
    );

    expect(r.otMienThue).toBe(100_000);
  });

  it('otMienThue âm bị kẹp về 0 — không thu THỪA thuế', () => {
    const r = tinhDongLuong(
      dauVao({ tienOt: 100_000, otMienThue: -50_000 }),
      chOt(),
    );

    expect(r.otMienThue).toBe(0);
  });

  it('dv thiếu tienOt/otMienThue (nơi gọi cũ) rơi về 0, KHÔNG NaN', () => {
    const dv = dauVao() as any;
    delete dv.tienOt;
    delete dv.otMienThue;

    const r = tinhDongLuong(dv, cauHinh());
    expect(r.otMienThue).toBe(0);
    expect(Number.isNaN(r.thuNhapTinhThue)).toBe(false);
  });
});

/**
 * Ăn ca là suất ăn của NGÀY CÓ MẶT, nên `DINH_MUC_x_CONG` nhân với số ngày
 * làm đủ (ký hiệu `X`) chứ không phải tổng công quy đổi.
 *
 * Trước bản vá nó nhân với `congThuong` = `soNgayCong` của bảng công — con số
 * đó tính P/L/NB/CT là 1 công và `1/2` là 0,5 công, nên người nghỉ phép vẫn
 * được suất ăn. Đo trên production tháng 07/2026, NV0004 có X=22 + P=1 ⇒ ăn
 * ca ra 50k×23 thay vì 50k×22.
 */
describe('DINH_MUC_x_CONG — chỉ tính ngày làm đủ', () => {
  it('nghỉ phép KHÔNG được tính suất ăn', () => {
    // 22 ngày X + 1 ngày P: tổng công quy đổi 23, ngày làm đủ 22.
    const r = tinhDongLuong(
      dauVao({ congThuong: 23, congDayDu: 22 }),
      cauHinh(),
    );
    expect(r.giaTriTungKhoan.AN_CA).toBe(50_000 * 22);
  });

  it('nửa ngày KHÔNG được tính nửa suất ăn — chỉ ngày làm đủ mới có', () => {
    // 21 ngày X + 2 ngày '1/2' → congThuong 22, congDayDu 21.
    const r = tinhDongLuong(
      dauVao({ congThuong: 22, congDayDu: 21 }),
      cauHinh(),
    );
    expect(r.giaTriTungKhoan.AN_CA).toBe(50_000 * 21);
  });

  it('lương theo công VẪN dùng tổng công quy đổi, không đổi theo bản vá này', () => {
    // Nghỉ phép là ngày hưởng lương — cắt nó khỏi LUONG_THEO_CONG là ăn bớt
    // lương của người lao động. Chỉ ăn ca đổi cách đếm.
    const r = tinhDongLuong(
      dauVao({ base: 24_000_000, congThuong: 23, congDayDu: 22 }),
      cauHinh(),
    );
    expect(r.giaTriTungKhoan.LUONG_CONG).toBe(
      lamTronTheo((24_000_000 / 24) * 23, 1000),
    );
  });

  it('dòng lương cũ (chưa có congDayDu) giữ nguyên cách tính cũ, không tụt về 0', () => {
    // Tính lại một dòng lưu trước bản vá mà cho ăn ca = 0 là MẤT TIỀN im lặng
    // trên phiếu lương thật — tệ hơn hẳn con số cũ hơi rộng tay.
    const cu = dauVao({ congThuong: 23 });
    delete (cu as Partial<DauVaoDongLuong>).congDayDu;
    const r = tinhDongLuong(cu, cauHinh());
    expect(r.giaTriTungKhoan.AN_CA).toBe(50_000 * 23);
  });
});

/**
 * Mức riêng theo người: mỗi khoản mang SỐ TIỀN có một mức chung của công ty
 * (`thamSo.soTien` / `thamSo.dinhMuc`), và hồ sơ từng nhân viên ghi đè được
 * bằng `giaTriKhoan[mã khoản]`.
 *
 * Phân biệt bằng CÓ KHOÁ hay không, KHÔNG bằng "khác 0": "để trống" (ăn theo
 * công ty) và "đặt bằng 0" (người này không có khoản đó) là hai câu trả lời
 * khác nhau. Hiểu lẫn hai thứ này chính là lỗi đã làm tắt BHXH của NV0004.
 */
describe('giaTriKhoan — mức riêng theo người', () => {
  function chungCoPhuCap() {
    const ch = cauHinh();
    ch.khoanLuong = [
      ...ch.khoanLuong,
      {
        ma: 'PC_CHUC_VU', ten: 'Phụ cấp chức vụ', loaiCongThuc: 'CO_DINH_THANG',
        thamSo: { soTien: 500_000 }, chiuThue: true, tranMienThue: null,
        vaoTongThuNhap: true, vaoBHXH: false, thuTu: 9,
      },
    ];
    return ch;
  }

  it('không khai riêng → ăn mức chung của công ty', () => {
    const r = tinhDongLuong(dauVao(), chungCoPhuCap());
    expect(r.giaTriTungKhoan.PC_CHUC_VU).toBe(500_000); // 500k/24×24
  });

  it('khai riêng → ăn mức riêng, không phải mức chung', () => {
    const r = tinhDongLuong(
      dauVao({ giaTriKhoan: { PC_CHUC_VU: 3_000_000 } }),
      chungCoPhuCap(),
    );
    expect(r.giaTriTungKhoan.PC_CHUC_VU).toBe(3_000_000);
  });

  it('khai riêng bằng 0 → ĐÚNG 0, không rơi về mức chung', () => {
    // Đây là điểm dễ sai nhất của cả tính năng: `|| mức chung` sẽ biến người
    // cố ý không có phụ cấp thành người ăn mức chung.
    const r = tinhDongLuong(
      dauVao({ giaTriKhoan: { PC_CHUC_VU: 0 } }),
      chungCoPhuCap(),
    );
    expect(r.giaTriTungKhoan.PC_CHUC_VU).toBe(0);
  });

  it('khai riêng khoản KHÁC không ảnh hưởng khoản này', () => {
    const r = tinhDongLuong(
      dauVao({ giaTriKhoan: { KHOAN_LA: 9_000_000 } }),
      chungCoPhuCap(),
    );
    expect(r.giaTriTungKhoan.PC_CHUC_VU).toBe(500_000);
  });

  it('mức riêng VẪN chia theo công như mức chung', () => {
    // Nghỉ nửa tháng thì phụ cấp cũng nửa — không trả nguyên tháng.
    const r = tinhDongLuong(
      dauVao({ congThuong: 12, congDayDu: 12, giaTriKhoan: { PC_CHUC_VU: 2_400_000 } }),
      chungCoPhuCap(),
    );
    expect(r.giaTriTungKhoan.PC_CHUC_VU).toBe(1_200_000); // 2.4tr/24×12
  });

  it('DINH_MUC_x_CONG cũng ghi đè được — ăn ca riêng cho một người', () => {
    const r = tinhDongLuong(
      dauVao({ congDayDu: 20, giaTriKhoan: { AN_CA: 80_000 } }),
      cauHinh(),
    );
    expect(r.giaTriTungKhoan.AN_CA).toBe(80_000 * 20);
  });

  it('khoản mang TỶ LỆ không bị ghi đè — tỷ lệ là việc của công ty', () => {
    const ch = cauHinh();
    ch.khoanLuong = [
      ...ch.khoanLuong,
      {
        ma: 'TRACH_NHIEM', ten: 'Trách nhiệm', loaiCongThuc: 'PHAN_TRAM_BASE',
        thamSo: { tyLe: 0.1 }, chiuThue: true, tranMienThue: null,
        vaoTongThuNhap: true, vaoBHXH: false, thuTu: 10,
      },
    ];

    const r = tinhDongLuong(
      dauVao({ base: 10_000_000, giaTriKhoan: { TRACH_NHIEM: 0.5 } }),
      ch,
    );
    expect(r.giaTriTungKhoan.TRACH_NHIEM).toBe(1_000_000); // vẫn 10%
  });

  it('nguonHoSo cũ vẫn chạy khi chưa khai giaTriKhoan (không phá cấu hình đang dùng)', () => {
    const ch = cauHinh();
    ch.khoanLuong = [
      ...ch.khoanLuong,
      {
        ma: 'PHU_CAP', ten: 'Phụ cấp cố định', loaiCongThuc: 'CO_DINH_THANG',
        thamSo: { nguonHoSo: 'phuCapCoDinh' }, chiuThue: true, tranMienThue: null,
        vaoTongThuNhap: true, vaoBHXH: false, thuTu: 11,
      },
    ];

    const r = tinhDongLuong(dauVao({ phuCapCoDinh: 700_000 }), ch);
    expect(r.giaTriTungKhoan.PHU_CAP).toBe(700_000);
  });

  it('giaTriKhoan THẮNG nguonHoSo cũ khi cả hai cùng có', () => {
    const ch = cauHinh();
    ch.khoanLuong = [
      ...ch.khoanLuong,
      {
        ma: 'PHU_CAP', ten: 'Phụ cấp cố định', loaiCongThuc: 'CO_DINH_THANG',
        thamSo: { nguonHoSo: 'phuCapCoDinh' }, chiuThue: true, tranMienThue: null,
        vaoTongThuNhap: true, vaoBHXH: false, thuTu: 11,
      },
    ];

    const r = tinhDongLuong(
      dauVao({ phuCapCoDinh: 700_000, giaTriKhoan: { PHU_CAP: 1_500_000 } }),
      ch,
    );
    expect(r.giaTriTungKhoan.PHU_CAP).toBe(1_500_000);
  });
});
