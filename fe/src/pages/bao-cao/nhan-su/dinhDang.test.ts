import { describe, expect, it } from 'vitest';
import { dinhDangGiaTri, dinhDangNhanBieuDo, tinhBienDong } from './dinhDang';

describe('dinhDangGiaTri', () => {
  it('dùng dấu phẩy thập phân và dấu chấm phân nhóm nghìn kiểu Việt Nam', () => {
    expect(dinhDangGiaTri(86.4, 'phan_tram')).toBe('86,4%');
    expect(dinhDangGiaTri(4200000, 'tien')).toBe('4.200.000 đ');
  });

  it('không hiện phần thập phân với đơn vị đếm được', () => {
    expect(dinhDangGiaTri(142, 'nguoi')).toBe('142 người');
    expect(dinhDangGiaTri(5, 'luot')).toBe('5 lượt');
  });

  it('bù số 0 để mọi tỷ lệ cùng một số chữ số sau dấu phẩy', () => {
    // 86% và 86,4% đặt cạnh nhau lệch hàng thì bảng chỉ số trông như lỗi.
    expect(dinhDangGiaTri(86, 'phan_tram')).toBe('86,0%');
  });

  it('nhãn trên mark biểu đồ bỏ hậu tố cho đỡ chật', () => {
    expect(dinhDangNhanBieuDo(86.4, 'phan_tram')).toBe('86,4');
    expect(dinhDangNhanBieuDo(142, 'nguoi')).toBe('142');
  });
});

describe('tinhBienDong', () => {
  it('trả null khi không có kỳ trước để so', () => {
    expect(tinhBienDong(142, undefined, 'tang', 'nguoi')).toBeNull();
  });

  it('tính chênh lệch và phần trăm thay đổi', () => {
    const bd = tinhBienDong(142, 138, 'tang', 'nguoi');
    expect(bd).toEqual({ chenhLech: 4, phanTramThayDoi: 2.9, huong: 'tot' });
  });

  it('KHÔNG ra Infinity khi kỳ trước bằng 0', () => {
    // Chia cho 0 ra Infinity, và "tăng vô hạn phần trăm" in lên báo cáo là vô nghĩa.
    const bd = tinhBienDong(5, 0, 'tang', 'luot');
    expect(bd?.phanTramThayDoi).toBeNull();
    expect(bd?.chenhLech).toBe(5);
    expect(bd?.huong).toBe('tot');
  });

  it('đảo chiều tốt/xấu theo chieuTot chứ không theo dấu của chênh lệch', () => {
    // Tỷ lệ nghỉ việc giảm = tin TỐT.
    expect(tinhBienDong(4.2, 5.3, 'giam', 'phan_tram')?.huong).toBe('tot');
    // Tỷ lệ vượt thử việc giảm = tin XẤU, cùng dấu chênh lệch âm.
    expect(tinhBienDong(80.0, 84.6, 'tang', 'phan_tram')?.huong).toBe('xau');
  });

  it('coi là trung tính khi chỉ số không khai chieuTot hoặc không đổi', () => {
    expect(tinhBienDong(120, 100, undefined, 'nguoi')?.huong).toBe('khong_doi');
    expect(tinhBienDong(100, 100, 'tang', 'nguoi')?.huong).toBe('khong_doi');
  });

  it('làm tròn chênh lệch theo số lẻ của đơn vị', () => {
    // 1.2 - 1.5 trong dấu phẩy động ra -0.30000000000000004.
    expect(tinhBienDong(1.2, 1.5, 'giam', 'phan_tram')?.chenhLech).toBe(-0.3);
  });
});
