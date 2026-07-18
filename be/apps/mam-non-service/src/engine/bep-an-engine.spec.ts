import * as fc from 'fast-check';
import {
  toNumber, tinhTieuHao, tinhNganSach, tinhDonGiaBinhQuan, tinhChiPhiThuc, tinhHaoPhi,
} from './bep-an-engine';

describe('toNumber', () => {
  it('ép chuỗi decimal Mongo về số; rác → 0', () => {
    expect(toNumber('15.00')).toBe(15);
    expect(toNumber(3)).toBe(3);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber('abc')).toBe(0);
  });
});

describe('tinhTieuHao', () => {
  const congThuc = { CT1: { chiTiet: [
    { hangHoaMa: 'G01', hangHoaTen: 'Gạo', donViTinh: 'kg', dinhLuong: 0.1 },
    { hangHoaMa: 'T01', hangHoaTen: 'Thịt', donViTinh: 'kg', dinhLuong: 0.05 },
  ] } };
  it('tiêu hao = Σ số suất × định lượng theo hàng hóa', () => {
    const rows = [
      { soTreAnThucTe: 90, congThucCode: 'CT1' },
      { soTreAnThucTe: 10, congThucCode: 'CT1' },
    ];
    const out = tinhTieuHao(rows, congThuc);
    const gao = out.find((x) => x.hangHoaMa === 'G01')!;
    expect(gao.soLuong).toBeCloseTo(100 * 0.1); // 10
  });
  it('bỏ qua dòng không có công thức khớp', () => {
    expect(tinhTieuHao([{ soTreAnThucTe: 50, congThucCode: 'X' }], congThuc)).toEqual([]);
  });
  it('property: tổng tiêu hao 1 hàng hóa = (Σ số suất) × định lượng khi cùng công thức', () => {
    fc.assert(fc.property(
      fc.array(fc.integer({ min: 0, max: 500 }), { minLength: 0, maxLength: 30 }),
      (sizes) => {
        const rows = sizes.map((s) => ({ soTreAnThucTe: s, congThucCode: 'CT1' }));
        const out = tinhTieuHao(rows, congThuc);
        const tongSuat = sizes.reduce((a, b) => a + b, 0);
        const gao = out.find((x) => x.hangHoaMa === 'G01');
        const expected = tongSuat * 0.1;
        return tongSuat === 0 ? (gao === undefined || Math.abs(gao.soLuong) < 1e-9)
                              : Math.abs((gao?.soLuong ?? 0) - expected) < 1e-6;
      },
    ), { numRuns: 100 });
  });
});

describe('tinhNganSach', () => {
  it('Σ số trẻ × mức định mức khớp lớp; fallback CHUNG', () => {
    const dm = [
      { phamVi: 'LOP', doiTuongMa: 'L1', mucTien: 35000 },
      { phamVi: 'CHUNG', mucTien: 30000 },
    ];
    const rows = [
      { lopMa: 'L1', soTreAnThucTe: 10 },   // 10 × 35000
      { lopMa: 'L2', soTreAnThucTe: 5 },    // fallback CHUNG 5 × 30000
    ];
    expect(tinhNganSach(rows, dm)).toBe(10 * 35000 + 5 * 30000);
  });
  it('không có định mức khớp và không CHUNG → 0 cho dòng đó', () => {
    expect(tinhNganSach([{ lopMa: 'L9', soTreAnThucTe: 10 }], [{ phamVi: 'LOP', doiTuongMa: 'L1', mucTien: 1 }])).toBe(0);
  });
});

describe('tinhDonGiaBinhQuan', () => {
  it('đơn giá bq = Σ thành tiền / Σ số lượng theo hàng hóa', () => {
    const rows = [
      { hangHoaMa: 'G01', soLuong: 10, thanhTien: 100 }, // 10đ/kg
      { hangHoaMa: 'G01', soLuong: 10, thanhTien: 300 }, // 30đ/kg → bq (400/20)=20
    ];
    expect(tinhDonGiaBinhQuan(rows)['G01']).toBe(20);
  });
  it('số lượng 0 → đơn giá 0 (không chia 0)', () => {
    expect(tinhDonGiaBinhQuan([{ hangHoaMa: 'X', soLuong: 0, thanhTien: 50 }])['X']).toBe(0);
  });
});

describe('tinhChiPhiThuc', () => {
  it('= Σ tiêu hao × đơn giá bq', () => {
    const tieuHao = [
      { hangHoaMa: 'G01', hangHoaTen: 'Gạo', soLuong: 10 },
      { hangHoaMa: 'T01', hangHoaTen: 'Thịt', soLuong: 5 },
    ];
    expect(tinhChiPhiThuc(tieuHao, { G01: 20, T01: 100 })).toBe(10 * 20 + 5 * 100);
  });
});

describe('tinhHaoPhi', () => {
  it('chênh lệch, %, cờ vượt', () => {
    expect(tinhHaoPhi(1000, 1200)).toEqual({ chenhLech: 200, haoPhiPct: 20, vuot: true });
    expect(tinhHaoPhi(1000, 900)).toEqual({ chenhLech: -100, haoPhiPct: -10, vuot: false });
    expect(tinhHaoPhi(0, 500).vuot).toBe(true);       // ngân sách 0, có chi → vượt
    expect(tinhHaoPhi(0, 0)).toEqual({ chenhLech: 0, haoPhiPct: 0, vuot: false });
  });
  it('ngưỡng cảnh báo: chỉ vượt khi > ngân sách × (1+ngưỡng)', () => {
    expect(tinhHaoPhi(1000, 1050, 10).vuot).toBe(false); // +5% < ngưỡng 10%
    expect(tinhHaoPhi(1000, 1150, 10).vuot).toBe(true);  // +15% > 10%
  });
});
