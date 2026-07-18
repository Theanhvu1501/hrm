import { buildButToanGiaVon, buildPhieuXuatKho } from './ghi-so-tieu-hao.builder';

describe('buildButToanGiaVon', () => {
  it('Nợ 632 / Có 152, soTien = chi phí thực (number)', () => {
    const b = buildButToanGiaVon(1200, new Date('2026-07-06T00:00:00Z'), 'Xuất ăn 06/07');
    expect(b.danhMuc.taiKhoanNo.ma).toBe('632');
    expect(b.danhMuc.taiKhoanCo.ma).toBe('152');
    expect(b.soTien).toBe(1200);
    expect(typeof b.ngay).toBe('string');
  });
});

describe('buildPhieuXuatKho', () => {
  it('loaiPhieu XUAT, chiTiet = tiêu hao × đơn giá, tkNo 632/tkCo 152', () => {
    const tieuHao = [{ hangHoaMa: 'G01', hangHoaTen: 'Gạo', donViTinh: 'kg', soLuong: 10 }];
    const p = buildPhieuXuatKho(tieuHao, { G01: 20 }, new Date('2026-07-06T00:00:00Z'));
    expect(p.loaiPhieu).toBe('XUAT');
    expect(p.chiTiet[0].soLuong).toBe(10);
    expect(p.chiTiet[0].donGia).toBe(20);
    expect(p.chiTiet[0].thanhTien).toBe(200);
    expect(p.chiTiet[0].tkNo).toBe('632');
    expect(p.chiTiet[0].tkCo).toBe('152');
  });
});
