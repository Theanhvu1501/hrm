import { dungBacThueNam, quyetToanMotNguoi } from './quyet-toan-tncn';
import { thueLuyTien } from './tinh-luong';
import type { BacThue } from '@app/entities';

const BAC_THANG: BacThue[] = [
  { den: 5_000_000, suat: 0.05 },
  { den: 10_000_000, suat: 0.1 },
  { den: 18_000_000, suat: 0.15 },
  { den: 32_000_000, suat: 0.2 },
  { den: 52_000_000, suat: 0.25 },
  { den: 80_000_000, suat: 0.3 },
  { den: null, suat: 0.35 },
];

const CH = {
  bacThue: BAC_THANG,
  giamTruBanThan: 11_000_000,
  giamTruNPT: 4_400_000,
  lamTron: 1000,
} as any;

/** Một dòng lương đã chốt. `thue` là số ĐÃ khấu trừ trong tháng đó. */
const dong = (thang: string, over: any = {}) => ({
  thang,
  employeeId: 'nv1',
  employeeName: 'Nguyễn Văn A',
  employeeCode: 'NV0001',
  soNguoiPhuThuoc: 0,
  thoiVu: false,
  camKet: false,
  hopDongThu2: false,
  trangThai: 'chot',
  thucTe: {
    tongThuNhap: 20_000_000,
    mienThueKhoan: 0,
    otMienThue: 0,
    bhxh: 0,
    thue: 0,
    ...(over.thucTe ?? {}),
  },
  ...over,
});

describe('dungBacThueNam', () => {
  it('bậc năm = bậc tháng × 12, bậc cuối vẫn vô hạn', () => {
    const nam = dungBacThueNam(BAC_THANG);

    expect(nam[0]).toEqual({ den: 60_000_000, suat: 0.05 });
    expect(nam[2]).toEqual({ den: 216_000_000, suat: 0.15 });
    expect(nam[nam.length - 1]).toEqual({ den: null, suat: 0.35 });
  });

  it('không mutate bậc tháng', () => {
    dungBacThueNam(BAC_THANG);
    expect(BAC_THANG[0].den).toBe(5_000_000);
  });
});

describe('quyetToanMotNguoi', () => {
  it('ĐIỂM CỐT LÕI: thuế năm KHÔNG phải tổng thuế 12 tháng khi thu nhập không đều', () => {
    // 11 tháng 10tr + 1 tháng 130tr. Tháng thưởng bị đánh bậc cao; cả năm gộp
    // lại thì phần lớn thu nhập vẫn rơi bậc thấp hơn → khấu trừ THỪA.
    const ds = [
      ...Array.from({ length: 11 }, (_, i) =>
        dong(`2026-${String(i + 1).padStart(2, '0')}`, {
          thucTe: { tongThuNhap: 10_000_000, thue: 0 },
        }),
      ),
      dong('2026-12', { thucTe: { tongThuNhap: 130_000_000, thue: 20_000_000 } }),
    ];

    const kq = quyetToanMotNguoi(ds as any, CH);

    // Tổng thu nhập 240tr, giảm trừ bản thân 12 × 11tr = 132tr ⇒ TNTT 108tr.
    expect(kq.caNam.thuNhapTinhThue).toBe(108_000_000);
    expect(kq.caNam.thue).toBe(
      thueLuyTien(108_000_000, dungBacThueNam(BAC_THANG)),
    );
    expect(kq.daKhauTru).toBe(20_000_000);
    expect(kq.chenhLech).toBe(kq.caNam.thue - 20_000_000);
    // Khẳng định thẳng: đây KHÔNG phải phép cộng thuế tháng.
    expect(kq.caNam.thue).not.toBe(kq.daKhauTru);
  });

  it('chênh lệch ÂM = được hoàn', () => {
    const ds = [
      dong('2026-01', { thucTe: { tongThuNhap: 200_000_000, thue: 50_000_000 } }),
    ];

    const kq = quyetToanMotNguoi(ds as any, CH);
    expect(kq.chenhLech).toBeLessThan(0);
  });

  it('giảm trừ bản thân tính theo SỐ THÁNG CÓ THU NHẬP, không phải 12 cứng', () => {
    // Vào làm tháng 7 ⇒ 6 tháng giảm trừ, không phải 12 (TT 111/2013 Đ9.1).
    const ds = Array.from({ length: 6 }, (_, i) =>
      dong(`2026-${String(i + 7).padStart(2, '0')}`, {
        thucTe: { tongThuNhap: 20_000_000, thue: 0 },
      }),
    );

    const kq = quyetToanMotNguoi(ds as any, CH);

    expect(kq.soKyDaChot).toBe(6);
    expect(kq.caNam.giamTruBanThan).toBe(6 * 11_000_000);
  });

  it('giảm trừ NPT cộng THEO TỪNG THÁNG — đăng ký thêm con giữa năm', () => {
    const ds = [
      dong('2026-01', { soNguoiPhuThuoc: 0 }),
      dong('2026-02', { soNguoiPhuThuoc: 1 }),
      dong('2026-03', { soNguoiPhuThuoc: 2 }),
    ];

    const kq = quyetToanMotNguoi(ds as any, CH);

    // (0 + 1 + 2) × 4.4tr — KHÔNG phải 3 tháng × 2 người.
    expect(kq.caNam.giamTruNPT).toBe(3 * 4_400_000);
  });

  it('gom đúng quý theo tháng, quý là CỘNG THẲNG không tính lại', () => {
    const ds = [
      dong('2026-02', { thucTe: { tongThuNhap: 10_000_000, thue: 300_000 } }),
      dong('2026-05', { thucTe: { tongThuNhap: 20_000_000, thue: 900_000 } }),
      dong('2026-08', { thucTe: { tongThuNhap: 30_000_000, thue: 2_000_000 } }),
      dong('2026-11', { thucTe: { tongThuNhap: 40_000_000, thue: 4_000_000 } }),
    ];

    const kq = quyetToanMotNguoi(ds as any, CH);

    expect(kq.quy[0].tongThuNhapChiuThue).toBe(10_000_000);
    expect(kq.quy[1].tongThuNhapChiuThue).toBe(20_000_000);
    expect(kq.quy[2].tongThuNhapChiuThue).toBe(30_000_000);
    expect(kq.quy[3].tongThuNhapChiuThue).toBe(40_000_000);
    // Thuế quý là số ĐÃ khấu trừ, cộng thẳng — phải khớp tờ khai quý đã nộp.
    expect(kq.quy[3].thue).toBe(4_000_000);
    expect(kq.daKhauTru).toBe(300_000 + 900_000 + 2_000_000 + 4_000_000);
  });

  it('tổng thu nhập CHỊU THUẾ đã trừ khoản miễn — không trừ ăn ca hai lần', () => {
    const ds = [
      dong('2026-01', {
        thucTe: {
          tongThuNhap: 20_000_000,
          mienThueKhoan: 1_200_000,
          otMienThue: 300_000,
          thue: 0,
        },
      }),
    ];

    const kq = quyetToanMotNguoi(ds as any, CH);

    expect(kq.caNam.khoanMienThue).toBe(1_500_000);
    expect(kq.caNam.tongThuNhapChiuThue).toBe(18_500_000);
  });

  it('trừ BHXH khỏi thu nhập tính thuế', () => {
    const ds = [
      dong('2026-01', {
        thucTe: { tongThuNhap: 50_000_000, bhxh: 2_000_000, thue: 0 },
      }),
    ];

    const kq = quyetToanMotNguoi(ds as any, CH);

    // 50tr − 2tr(BHXH) − 11tr(giảm trừ 1 tháng) = 37tr.
    expect(kq.caNam.thuNhapTinhThue).toBe(37_000_000);
  });

  it('HĐLĐ thứ 2: giảm trừ = 0 — đã đăng ký ở nơi thứ nhất', () => {
    const ds = [dong('2026-01', { hopDongThu2: true, soNguoiPhuThuoc: 2 })];

    const kq = quyetToanMotNguoi(ds as any, CH);

    expect(kq.caNam.giamTruBanThan).toBe(0);
    expect(kq.caNam.giamTruNPT).toBe(0);
    expect(kq.ghiChu).toMatch(/HĐLĐ thứ 2/);
  });

  it('thu nhập tính thuế không bao giờ ÂM', () => {
    const ds = [dong('2026-01', { thucTe: { tongThuNhap: 3_000_000, thue: 0 } })];

    const kq = quyetToanMotNguoi(ds as any, CH);

    expect(kq.caNam.thuNhapTinhThue).toBe(0);
    expect(kq.caNam.thue).toBe(0);
  });

  it('danh sách rỗng không ném, trả về số 0', () => {
    const kq = quyetToanMotNguoi([] as any, CH);

    expect(kq.soKyDaChot).toBe(0);
    expect(kq.caNam.thue).toBe(0);
    expect(kq.chenhLech).toBe(0);
  });

  it('BỎ dòng chưa chốt — bảng quyết toán chỉ đọc kỳ đã chốt', () => {
    const ds = [
      dong('2026-01'),
      dong('2026-02', { trangThai: 'nhap' }),
    ];

    const kq = quyetToanMotNguoi(ds as any, CH);
    expect(kq.soKyDaChot).toBe(1);
  });

  it('ghi chú khi có tháng thời vụ lẫn trong năm', () => {
    const ds = [dong('2026-01'), dong('2026-02', { thoiVu: true })];

    const kq = quyetToanMotNguoi(ds as any, CH);
    expect(kq.ghiChu).toMatch(/thời vụ/);
  });

  it('làm tròn thuế theo cấu hình', () => {
    const ds = [
      dong('2026-01', { thucTe: { tongThuNhap: 20_123_456, thue: 0 } }),
    ];

    const kq = quyetToanMotNguoi(ds as any, CH);
    expect(kq.caNam.thue % 1000).toBe(0);
  });
});
