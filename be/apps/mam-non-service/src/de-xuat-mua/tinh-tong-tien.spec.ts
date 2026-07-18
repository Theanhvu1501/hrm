import * as fc from 'fast-check';
import { tinhTongTien } from './de-xuat-mua.service';

describe('tinhTongTien', () => {
  it('tổng = Σ thanhTien', () => {
    expect(tinhTongTien([{ thanhTien: 10 }, { thanhTien: 5 }])).toBe(15);
    expect(tinhTongTien([])).toBe(0);
  });
  it('bỏ qua thanhTien thiếu; luôn = tổng các thanhTien có mặt', () => {
    fc.assert(fc.property(
      fc.array(fc.record({ thanhTien: fc.option(fc.integer({ min: 0, max: 1e6 }), { nil: undefined }) })),
      (rows) => {
        const expected = rows.reduce((s, r) => s + (r.thanhTien ?? 0), 0);
        return tinhTongTien(rows) === expected;
      },
    ), { numRuns: 100 });
  });
});
