import * as fc from 'fast-check';
import { buildButToanNhanHang, buildPhieuNhapKho } from './nhan-hang.builder';

const deXuat: any = {
  soPhieu: 'DX00001',
  ngayDeXuat: new Date('2026-07-06T00:00:00Z'),
  doiTuongMa: 'NCC_ABC', doiTuongTen: 'Công ty ABC',
  tongTien: 15,
  chiTiet: [
    { stt: 1, hangHoaMa: 'G01', hangHoaTen: 'Gạo', donViTinh: 'kg', soLuong: 2, donGia: 5, thanhTien: 10 },
    { stt: 2, hangHoaMa: 'T01', hangHoaTen: 'Thịt', donViTinh: 'kg', soLuong: 1, donGia: 5, thanhTien: 5 },
  ],
};

describe('buildButToanNhanHang', () => {
  it('Nợ 152 / Có 331, NCC ở doiTuong2, soTien = tongTien', () => {
    const b = buildButToanNhanHang(deXuat);
    expect(b.danhMuc.taiKhoanNo.ma).toBe('152');
    expect(b.danhMuc.taiKhoanCo.ma).toBe('331');
    expect(b.danhMuc.doiTuong2.ma).toBe('NCC_ABC');
    expect(b.danhMuc.doiTuong2.loai).toBe('NHA_CUNG_CAP');
    expect(b.soTien).toBe(15);
    expect(b.loai).toBe('PHIEU_CHI');
    expect(typeof b.ngay).toBe('string');
    expect(b.danhMuc.doiTuong).toBeUndefined(); // NCC KHÔNG ở doiTuong (bên Nợ là 152 kho)
  });

  it('tongTien kiểu STRING (Mongo/TypeORM decimal) → soTien là number thực sự', () => {
    const dxDecimalString: any = { ...deXuat, tongTien: '15.00' };
    const b = buildButToanNhanHang(dxDecimalString);
    const p = buildPhieuNhapKho(dxDecimalString);
    expect(b.soTien).toBe(15);
    expect(typeof b.soTien).toBe('number');
    expect(p.tongTien).toBe(15);
    expect(typeof p.tongTien).toBe('number');
  });
});

describe('buildPhieuNhapKho', () => {
  it('loaiPhieu NHAP, chiTiet map từ đề xuất, tkNo/tkCo 152/331', () => {
    const p = buildPhieuNhapKho(deXuat);
    expect(p.loaiPhieu).toBe('NHAP');
    expect(p.chiTiet).toHaveLength(2);
    expect(p.chiTiet[0].tkNo).toBe('152');
    expect(p.chiTiet[0].tkCo).toBe('331');
    expect(p.chiTiet[0].hangHoaMa).toBe('G01');
    expect(p.doiTuongMa).toBe('NCC_ABC');
  });
  it('số dòng phiếu nhập = số dòng đề xuất', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        stt: fc.integer(), hangHoaMa: fc.string(), hangHoaTen: fc.string(),
        soLuong: fc.integer({ min: 0 }), donGia: fc.integer({ min: 0 }), thanhTien: fc.integer({ min: 0 }),
      }), { minLength: 0, maxLength: 20 }),
      (chiTiet) => buildPhieuNhapKho({ ...deXuat, chiTiet }).chiTiet.length === chiTiet.length,
    ), { numRuns: 50 });
  });
});
