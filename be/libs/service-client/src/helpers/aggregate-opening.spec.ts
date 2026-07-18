import { aggregateOpeningByAccount } from './aggregate-opening';

describe('aggregateOpeningByAccount', () => {
  it('gop nhieu dong cung ma TK thanh 1, cong duNo/duCo', () => {
    const out = aggregateOpeningByAccount([
      { maTaiKhoan: '131', duNo: 100, duCo: 0, chiTietId: 'a' },
      { maTaiKhoan: '131', duNo: 50, duCo: 0, chiTietId: 'b' },
      { maTaiKhoan: '331', duNo: 0, duCo: 200, chiTietId: 'c' },
    ]);
    expect(out).toEqual([
      { maTaiKhoan: '131', duNo: 150, duCo: 0 },
      { maTaiKhoan: '331', duNo: 0, duCo: 200 },
    ]);
  });

  it('xu ly chuoi so va gia tri thieu', () => {
    const out = aggregateOpeningByAccount([
      { maTaiKhoan: '111', duNo: '10' as any, duCo: undefined as any },
      { maTaiKhoan: '111', duNo: 5, duCo: 3 },
    ]);
    expect(out).toEqual([{ maTaiKhoan: '111', duNo: 15, duCo: 3 }]);
  });

  it('mang rong tra ve mang rong', () => {
    expect(aggregateOpeningByAccount([])).toEqual([]);
  });
});
