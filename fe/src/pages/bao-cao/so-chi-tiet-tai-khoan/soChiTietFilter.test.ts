import { describe, it, expect } from 'vitest';
import type { SoChiTietReport, SoChiTietRow } from '@/services/soChiTietTaiKhoanService';
import { filterSoChiTietReports, isFilterableKey } from './soChiTietFilter';

const row = (over: Partial<SoChiTietRow>): SoChiTietRow => ({
  ngay: '2025-01-05',
  soPhieu: 'PT001',
  ngayChungTu: '2025-01-05',
  noiDung: 'Thu tiền khách hàng',
  tkDoiUng: '131',
  phatSinhNo: 0,
  phatSinhCo: 0,
  soDuNo: 0,
  soDuCo: 0,
  ...over,
});

const report = (over: Partial<SoChiTietReport>): SoChiTietReport => ({
  taiKhoan: { ma: '111', ten: 'Tiền mặt', loai: 'TAI_SAN' },
  soDuDauKyNo: 100,
  soDuDauKyCo: 0,
  rows: [],
  tongPhatSinhNo: 999, // số gốc BE — cố tình lệch để thấy khi nào tính lại
  tongPhatSinhCo: 999,
  soDuCuoiKyNo: 999,
  soDuCuoiKyCo: 999,
  ...over,
});

const reports: SoChiTietReport[] = [
  report({
    rows: [
      row({ soPhieu: 'PT001', noiDung: 'Thu tiền CÔNG TY G-LIFE', phatSinhNo: 50 }),
      row({ soPhieu: 'PC002', noiDung: 'Chi mua văn phòng phẩm', tkDoiUng: '642', phatSinhCo: 30 }),
    ],
  }),
  report({
    taiKhoan: { ma: '112', ten: 'Tiền gửi ngân hàng', loai: 'TAI_SAN' },
    soDuDauKyNo: 0,
    soDuDauKyCo: 0,
    rows: [row({ soPhieu: 'BN003', noiDung: 'Nộp tiền vào ngân hàng', phatSinhNo: 20 })],
  }),
];

describe('isFilterableKey', () => {
  it('cột ngày không lọc; cột chữ và cột số lọc được', () => {
    expect(isFilterableKey('soPhieu')).toBe(true);
    expect(isFilterableKey('noiDung')).toBe(true);
    expect(isFilterableKey('tkDoiUng')).toBe(true);
    expect(isFilterableKey('tenDoiTuong')).toBe(true);
    expect(isFilterableKey('ngay')).toBe(false);
    expect(isFilterableKey('ngayChungTu')).toBe(false);
    expect(isFilterableKey('phatSinhNo')).toBe(true);
    expect(isFilterableKey('phatSinhCo')).toBe(true);
    expect(isFilterableKey('soDuNo')).toBe(true);
    expect(isFilterableKey('soDuCo')).toBe(true);
  });
});

describe('filterSoChiTietReports', () => {
  it('không lọc → trả nguyên dữ liệu gốc của backend (không tính lại)', () => {
    const out = filterSoChiTietReports(reports, {
      noiDung: { kind: 'text', op: 'contains', value: '  ' },
    });
    expect(out).toBe(reports);
  });

  it('lọc bỏ dấu: cộng phát sinh + số dư cuối kỳ tính lại theo dòng còn hiện', () => {
    const out = filterSoChiTietReports(reports, {
      noiDung: { kind: 'text', op: 'contains', value: 'cong ty' },
    })!;

    expect(out).toHaveLength(1);
    const rep = out[0];
    expect(rep.taiKhoan.ma).toBe('111');
    expect(rep.rows.map((r) => r.soPhieu)).toEqual(['PT001']);
    expect(rep.tongPhatSinhNo).toBe(50);
    expect(rep.tongPhatSinhCo).toBe(0);
    // 100 (đầu kỳ Nợ) + 50 = 150
    expect(rep.soDuCuoiKyNo).toBe(150);
    expect(rep.soDuCuoiKyCo).toBe(0);
  });

  it('dư âm → dồn sang bên Có', () => {
    const out = filterSoChiTietReports([report({ soDuDauKyNo: 10, rows: [row({ phatSinhCo: 30 })] })], {
      tkDoiUng: { kind: 'text', op: 'equals', value: '131' },
    })!;
    expect(out[0].soDuCuoiKyNo).toBe(0);
    expect(out[0].soDuCuoiKyCo).toBe(20); // 10 - 30
  });

  it('lọc nhiều cột cùng lúc (AND)', () => {
    const out = filterSoChiTietReports(reports, {
      soPhieu: { kind: 'text', op: 'startsWith', value: 'PC' },
      tkDoiUng: { kind: 'text', op: 'equals', value: '642' },
    })!;
    expect(out).toHaveLength(1);
    expect(out[0].rows.map((r) => r.soPhieu)).toEqual(['PC002']);
    expect(out[0].tongPhatSinhCo).toBe(30);
  });

  it('bỏ hẳn bảng của tài khoản không còn dòng nào khớp', () => {
    const out = filterSoChiTietReports(reports, {
      soPhieu: { kind: 'text', op: 'startsWith', value: 'BN' },
    })!;
    expect(out.map((r) => r.taiKhoan.ma)).toEqual(['112']);
  });

  it('lọc không khớp gì → không còn bảng nào', () => {
    const out = filterSoChiTietReports(reports, {
      noiDung: { kind: 'text', op: 'contains', value: 'không tồn tại' },
    })!;
    expect(out).toEqual([]);
  });

  it('dữ liệu null → null', () => {
    expect(
      filterSoChiTietReports(null, { noiDung: { kind: 'text', op: 'contains', value: 'a' } }),
    ).toBeNull();
  });
});

describe('lọc cột số', () => {
  it('lọc "Phát sinh Nợ ≥ 2.000.000" và cộng lại tổng phát sinh + số dư cuối kỳ', () => {
    const rep = report({
      soDuDauKyNo: 1_000_000,
      soDuDauKyCo: 0,
      rows: [
        row({ soPhieu: 'PC001', phatSinhNo: 1_000_000 }),
        row({ soPhieu: 'PC002', phatSinhNo: 3_000_000 }),
      ],
    });

    const out = filterSoChiTietReports([rep], {
      phatSinhNo: { kind: 'number', op: 'gte', value: '2.000.000' },
    })!;

    expect(out).toHaveLength(1);
    expect(out[0].rows.map((r) => r.soPhieu)).toEqual(['PC002']);
    expect(out[0].tongPhatSinhNo).toBe(3_000_000);
    expect(out[0].soDuCuoiKyNo).toBe(4_000_000); // 1tr đầu kỳ + 3tr còn hiện
    expect(out[0].soDuCuoiKyCo).toBe(0);
  });

  it('(Trống) trên cột Phát sinh Có giữ dòng có Có = 0', () => {
    const rep = report({
      rows: [
        row({ soPhieu: 'PC001', phatSinhCo: 0 }),
        row({ soPhieu: 'PT001', phatSinhCo: 500_000 }),
      ],
    });

    const out = filterSoChiTietReports([rep], {
      phatSinhCo: { kind: 'number', op: 'blank', value: '' },
    })!;
    expect(out[0].rows.map((r) => r.soPhieu)).toEqual(['PC001']);
    expect(out[0].tongPhatSinhCo).toBe(0);
  });
});
