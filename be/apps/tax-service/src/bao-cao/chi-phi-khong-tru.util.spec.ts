import { buildCpKhongTru } from './chi-phi-khong-tru.util';

describe('buildCpKhongTru', () => {
  it('cộng auto (theo quý+nhóm) với điều chỉnh tay', () => {
    const auto = [
      { quy: 1, nhom: 1, soTien: 100 },
      { quy: 1, nhom: 3, soTien: 50 },
      { quy: 2, nhom: 4, soTien: 20 },
    ];
    const dieuChinh = {
      cpkdtDichVuHangHoa: [10, 0, 0, 0],
      cpkdtTscdCcdc: [0, 0, 0, 0],
      cpkdtNhanCong: [0, 0, 0, 0],
      cpkdtTaiChinhKhac: [0, 0, 0, 0],
    };
    const r = buildCpKhongTru(auto, dieuChinh as any);
    // Quý1: nhóm1 auto100+tay10=110, nhóm3 auto50 → tổng 160
    expect(r.perQuy[0][0]).toBe(110);
    expect(r.perQuy[0][2]).toBe(50);
    expect(r.tongPerQuy[0]).toBe(160);
    // Quý2: nhóm4 auto20 → tổng 20
    expect(r.tongPerQuy[1]).toBe(20);
  });
});
