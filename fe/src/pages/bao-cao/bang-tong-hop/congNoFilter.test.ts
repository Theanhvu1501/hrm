import { describe, it, expect } from 'vitest';
import type { BangTongHopCongNo, CongNoDoiTuongRow } from '@/services/congNoTongHopService';
import { filterCongNo } from './congNoFilter';

const dt = (ma: string, ten: string, n: number): CongNoDoiTuongRow => ({
  ma,
  ten,
  dauKy: { phaiThu: n, phaiTra: 0 },
  phatSinh: { phaiThu: n * 2, phaiTra: n },
  cuoiKy: { phaiThu: n * 3, phaiTra: n },
});

const data: BangTongHopCongNo = {
  accounts: [
    {
      ma: '131',
      ten: 'Phải thu khách hàng',
      dauKy: { phaiThu: 999, phaiTra: 999 }, // số gốc từ BE — cố tình lệch để thấy khi nào tính lại
      phatSinh: { phaiThu: 999, phaiTra: 999 },
      cuoiKy: { phaiThu: 999, phaiTra: 999 },
      doiTuongs: [dt('KH01', 'CÔNG TY G-LIFE', 100), dt('KH02', 'Công ty Vinamilk', 10)],
    },
    {
      ma: '331',
      ten: 'Phải trả người bán',
      dauKy: { phaiThu: 999, phaiTra: 999 },
      phatSinh: { phaiThu: 999, phaiTra: 999 },
      cuoiKy: { phaiThu: 999, phaiTra: 999 },
      doiTuongs: [dt('NCC01', 'Nhà cung cấp A', 5)],
    },
  ],
  totals: {
    dauKy: { phaiThu: 999, phaiTra: 999 },
    phatSinh: { phaiThu: 999, phaiTra: 999 },
    cuoiKy: { phaiThu: 999, phaiTra: 999 },
  },
};

describe('filterCongNo', () => {
  it('không lọc → trả nguyên dữ liệu gốc của backend (không tính lại)', () => {
    const out = filterCongNo(data, { ten: { kind: 'text', op: 'contains', value: '' } });
    expect(out).toBe(data);
  });

  it('lọc còn 1 đối tượng: dòng TK và TỔNG CỘNG bằng đúng đối tượng đó', () => {
    const out = filterCongNo(data, { ten: { kind: 'text', op: 'contains', value: 'g-life' } })!;

    expect(out.accounts).toHaveLength(1);
    const acc = out.accounts[0];
    expect(acc.ma).toBe('131');
    expect(acc.doiTuongs.map((d) => d.ma)).toEqual(['KH01']);
    expect(acc.dauKy).toEqual({ phaiThu: 100, phaiTra: 0 });
    expect(acc.cuoiKy).toEqual({ phaiThu: 300, phaiTra: 100 });
    expect(out.totals.dauKy).toEqual({ phaiThu: 100, phaiTra: 0 });
    expect(out.totals.phatSinh).toEqual({ phaiThu: 200, phaiTra: 100 });
  });

  it('TỔNG CỘNG cộng dồn nhiều tài khoản còn lại', () => {
    const out = filterCongNo(data, { ma: { kind: 'text', op: 'contains', value: '0' } })!; // khớp cả 3 đối tượng
    expect(out.accounts).toHaveLength(2);
    expect(out.totals.dauKy.phaiThu).toBe(115); // 100 + 10 + 5
    expect(out.totals.cuoiKy.phaiTra).toBe(115);
  });

  it('bỏ tài khoản không còn đối tượng nào khớp', () => {
    const out = filterCongNo(data, { ma: { kind: 'text', op: 'startsWith', value: 'kh' } })!;
    expect(out.accounts.map((a) => a.ma)).toEqual(['131']);
  });

  it('lọc không khớp gì → không còn tài khoản nào', () => {
    const out = filterCongNo(data, {
      ten: { kind: 'text', op: 'contains', value: 'không tồn tại' },
    })!;
    expect(out.accounts).toEqual([]);
  });

  it('dữ liệu null → null', () => {
    expect(filterCongNo(null, { ten: { kind: 'text', op: 'contains', value: 'a' } })).toBeNull();
  });
});

describe('lọc cột số', () => {
  it('lọc "Cuối kỳ Phải thu > 0" và cộng lại dòng TK + TỔNG CỘNG', () => {
    const numData: BangTongHopCongNo = {
      accounts: [
        {
          ma: '131',
          ten: 'Phải thu khách hàng',
          dauKy: { phaiThu: 999, phaiTra: 999 },
          phatSinh: { phaiThu: 999, phaiTra: 999 },
          cuoiKy: { phaiThu: 999, phaiTra: 999 },
          doiTuongs: [
            {
              ma: 'KH01',
              ten: 'Khách 1',
              dauKy: { phaiThu: 300, phaiTra: 0 },
              phatSinh: { phaiThu: 0, phaiTra: 0 },
              cuoiKy: { phaiThu: 300, phaiTra: 0 },
            },
            {
              ma: 'KH02',
              ten: 'Khách 2',
              dauKy: { phaiThu: 0, phaiTra: 0 },
              phatSinh: { phaiThu: 0, phaiTra: 0 },
              cuoiKy: { phaiThu: 0, phaiTra: 0 },
            },
          ],
        },
      ],
      totals: {
        dauKy: { phaiThu: 999, phaiTra: 999 },
        phatSinh: { phaiThu: 999, phaiTra: 999 },
        cuoiKy: { phaiThu: 999, phaiTra: 999 },
      },
    };

    const out = filterCongNo(numData, {
      'ck-pt': { kind: 'number', op: 'gt', value: '0' },
    })!;

    expect(out.accounts[0].doiTuongs.map((d) => d.ma)).toEqual(['KH01']);
    expect(out.accounts[0].cuoiKy.phaiThu).toBe(300);
    expect(out.accounts[0].dauKy.phaiThu).toBe(300);
    expect(out.totals.cuoiKy.phaiThu).toBe(300);
    expect(out.totals.cuoiKy.phaiTra).toBe(0);
  });
});
