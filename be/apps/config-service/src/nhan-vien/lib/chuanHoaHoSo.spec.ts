import { chuanHoaHoSo } from './chuanHoaHoSo';

describe('chuanHoaHoSo', () => {
  it('suy số người phụ thuộc từ danh sách Gia cảnh, bỏ qua số HR gõ tay', () => {
    const ra = chuanHoaHoSo({
      nguoiPhuThuoc: [{ hoTen: 'Con A' }, { hoTen: 'Con B' }],
      soNguoiPhuThuoc: 5,
    });
    expect(ra.soNguoiPhuThuoc).toBe(2);
  });

  it('danh sách rỗng ⇒ 0 người phụ thuộc', () => {
    const ra = chuanHoaHoSo({ nguoiPhuThuoc: [], soNguoiPhuThuoc: 3 });
    expect(ra.soNguoiPhuThuoc).toBe(0);
  });

  it('DTO không mang mảng Gia cảnh thì KHÔNG đụng tới số cũ', () => {
    const ra = chuanHoaHoSo({ soNguoiPhuThuoc: 3 });
    expect(ra.soNguoiPhuThuoc).toBe(3);
    expect(ra.nguoiPhuThuoc).toBeUndefined();
  });

  it('gắn id cho dòng chưa có, giữ nguyên id dòng đã có', () => {
    const ra = chuanHoaHoSo({
      bangCap: [{ id: 'bc-cu', ten: 'Đại học' }, { ten: 'Chứng chỉ' }],
      nguoiPhuThuoc: [{ id: 'npt-cu', hoTen: 'Con A' }, { hoTen: 'Con B' }],
    });
    expect(ra.bangCap![0].id).toBe('bc-cu');
    expect(ra.bangCap![1].id).toEqual(expect.any(String));
    expect(ra.bangCap![1].id).not.toBe('bc-cu');
    expect(ra.nguoiPhuThuoc![0].id).toBe('npt-cu');
    expect(ra.nguoiPhuThuoc![1].id).toEqual(expect.any(String));
  });

  it('mỗi dòng mới một id khác nhau — hai dòng chung id là file lẫn sang nhau', () => {
    const ra = chuanHoaHoSo({
      bangCap: [{ ten: 'A' }, { ten: 'B' }, { ten: 'C' }],
    });
    const ids = ra.bangCap!.map((b) => b.id);
    expect(new Set(ids).size).toBe(3);
  });
});
