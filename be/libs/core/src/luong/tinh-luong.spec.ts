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
    lamTron: 1000,
    ...over,
  };
}

function dauVao(over: Partial<DauVaoDongLuong> = {}): DauVaoDongLuong {
  return {
    base: 5_500_000, mucKhaiBao: 5_500_000,
    congThuong: 24, congThuViec: 0, congKhac: 0,
    phuCapCoDinh: 0, soNguoiPhuThuoc: 0, tamUng: 0, khauTruKhac: 0,
    dongBH: false, thoiVu: false, camKet: false,
    nhapTheoKy: {}, ...over,
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
    expect(r.thuNhapMienThue).toBe(1_200_000); // (không đóng BH nên chỉ ăn ca miễn)
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
    const tnCT = r.tongThuNhap - r.thuNhapMienThue;
    expect(r.thue).toBe(lamTronTheo(0.1 * tnCT, 1000));
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

  it('tắt chiuThue của ăn ca → không cộng vào thu nhập miễn kiểu "trần" mà miễn cả khoản', () => {
    const ch = cauHinh();
    ch.khoanLuong[1].chiuThue = false; // ăn ca không chịu thuế
    const r = tinhDongLuong(dauVao({ base: 15_000_000 }), ch);
    expect(r.thuNhapMienThue).toBe(1_200_000); // cả khoản ăn ca (=1.2tr) miễn
  });
});
