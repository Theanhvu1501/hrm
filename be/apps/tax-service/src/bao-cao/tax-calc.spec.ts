import { tinhThueSuatTNDN, tongVatTheoKy, tinhTNDNQuy } from './tax-calc';

describe('tinhThueSuatTNDN — bậc thang theo doanh thu lũy kế', () => {
  it('doanh thu < 1 tỷ → 0', () => expect(tinhThueSuatTNDN(900_000_000)).toBe(0));
  it('1 tỷ ≤ DT < 3 tỷ → 15%', () =>
    expect(tinhThueSuatTNDN(2_000_000_000)).toBe(0.15));
  it('3 tỷ ≤ DT < 50 tỷ → 17%', () =>
    expect(tinhThueSuatTNDN(10_000_000_000)).toBe(0.17));
  it('DT ≥ 50 tỷ → 20%', () =>
    expect(tinhThueSuatTNDN(60_000_000_000)).toBe(0.2));
  it('biên 1 tỷ → 15%', () => expect(tinhThueSuatTNDN(1_000_000_000)).toBe(0.15));
});

describe('tongVatTheoKy', () => {
  it('cộng tiền thuế', () =>
    expect(tongVatTheoKy([{ tienThue: 100 }, { tienThue: 50 }])).toBe(150));
  it('mảng rỗng → 0', () => expect(tongVatTheoKy([])).toBe(0));
});

describe('tinhTNDNQuy', () => {
  it('LN trước thuế = (511+515+711) − (632+641+642+811)', () => {
    const r = tinhTNDNQuy({
      dt511: 1000,
      dt515: 0,
      dt711: 0,
      cp632: 400,
      cp641: 100,
      cp642: 100,
      cp811: 0,
      chiPhiKhongTru: 0,
      thuNhapMien: 0,
      loChuyen: 0,
      thueSuat: 0.2,
    });
    expect(r.lnTruocThue).toBe(400);
    expect(r.thuNhapTinhThue).toBe(400);
    expect(r.thueTNDN).toBe(80);
    expect(r.lnSauThue).toBe(320);
  });

  it('chi phí không được trừ làm tăng thu nhập tính thuế', () => {
    const r = tinhTNDNQuy({
      dt511: 1000,
      dt515: 0,
      dt711: 0,
      cp632: 400,
      cp641: 0,
      cp642: 0,
      cp811: 0,
      chiPhiKhongTru: 200,
      thuNhapMien: 0,
      loChuyen: 0,
      thueSuat: 0.2,
    });
    expect(r.thuNhapTinhThue).toBe(800); // 600 + 200
    expect(r.thueTNDN).toBe(160);
  });

  it('thu nhập tính thuế âm → thuế TNDN = 0 (không âm)', () => {
    const r = tinhTNDNQuy({
      dt511: 100,
      dt515: 0,
      dt711: 0,
      cp632: 500,
      cp641: 0,
      cp642: 0,
      cp811: 0,
      chiPhiKhongTru: 0,
      thuNhapMien: 0,
      loChuyen: 0,
      thueSuat: 0.2,
    });
    expect(r.lnTruocThue).toBe(-400);
    expect(r.thueTNDN).toBe(0);
    expect(r.lnSauThue).toBe(-400);
  });
});
