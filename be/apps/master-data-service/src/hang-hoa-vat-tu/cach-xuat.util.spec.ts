import * as fc from 'fast-check';
import { CACH_XUAT_VALUES, isTieuHaoTheoCongThuc } from './cach-xuat.util';

describe('cachXuat classification', () => {
  it('chỉ DINH_LUONG và THEO_SUAT là tiêu hao theo công thức', () => {
    expect(isTieuHaoTheoCongThuc('DINH_LUONG')).toBe(true);
    expect(isTieuHaoTheoCongThuc('THEO_SUAT')).toBe(true);
    expect(isTieuHaoTheoCongThuc('DON_VI')).toBe(false);
  });

  it('mọi giá trị hợp lệ phân loại xác định (không throw)', () => {
    fc.assert(fc.property(fc.constantFrom(...CACH_XUAT_VALUES), (v) => {
      const r = isTieuHaoTheoCongThuc(v);
      return typeof r === 'boolean';
    }), { numRuns: 50 });
  });
});
