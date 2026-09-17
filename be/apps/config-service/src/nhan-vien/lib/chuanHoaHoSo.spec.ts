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

/**
 * Sự cố production 2026-09-17 (lần 2): sau khi thêm được NV0015 (hồ sơ đầu
 * tiên không gán tài khoản), MỌI lần "Thêm nhân viên" tiếp theo đều trả
 * "An unexpected error occurred". Log BE:
 *
 *   E11000 duplicate key error collection: nhan_su.employees
 *   index: tenantId_1_userId_1 dup key: { tenantId: "...", userId: "" }
 *
 * Chỉ mục `{tenantId, userId}` unique có `partialFilterExpression:
 * {userId: {$type: "string"}}` — dụng ý là "chỉ ràng buộc hồ sơ ĐÃ gán tài
 * khoản". Nhưng chuỗi rỗng VẪN là `$type: "string"`, nên hồ sơ thứ hai chưa
 * gán tài khoản đâm thẳng vào hồ sơ thứ nhất.
 *
 * FE cố ý gửi `""` (không phải `undefined`) để "gỡ liên kết" có hiệu lực —
 * xem docblock trong `hoSoNhanVienForm.convert.ts`. Nên chỗ sửa đúng là ở
 * đây: `""` là TÍN HIỆU của FE, `null` là thứ được phép ghi xuống Mongo.
 */
describe('chuanHoaHoSo — gỡ liên kết tài khoản', () => {
  it('userId chuỗi rỗng ⇒ null, KHÔNG được để "" rơi xuống Mongo', () => {
    const ra = chuanHoaHoSo({ userId: '' });
    expect(ra.userId).toBeNull();
  });

  it('userId thật giữ nguyên', () => {
    const ra = chuanHoaHoSo({ userId: 'sso-sub-123' });
    expect(ra.userId).toBe('sso-sub-123');
  });

  it('DTO không mang userId thì KHÔNG thêm khoá — PATCH đổi số điện thoại không được gỡ tài khoản', () => {
    const ra = chuanHoaHoSo({ soNguoiPhuThuoc: 3 });
    expect('userId' in ra).toBe(false);
  });

  it('userId đã là null thì vẫn là null', () => {
    const ra = chuanHoaHoSo({ userId: null });
    expect(ra.userId).toBeNull();
  });
});
