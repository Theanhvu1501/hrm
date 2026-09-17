import { randomUUID } from 'crypto';
import type { BangCap, NguoiPhuThuoc } from '@app/entities';

export interface HoSoCanChuanHoa {
  bangCap?: BangCap[];
  nguoiPhuThuoc?: NguoiPhuThuoc[];
  soNguoiPhuThuoc?: number;
  userId?: string | null;
}

/**
 * Ba việc phải làm mỗi lần ghi hồ sơ, tách ra khỏi service để test không cần DB:
 *
 * 1. Gắn `id` cho từng dòng bằng cấp / người phụ thuộc còn thiếu. Tệp đính kèm
 *    bám theo id này; để dòng không có id là dòng đó không đính kèm được.
 * 2. Suy `soNguoiPhuThuoc` từ danh sách Gia cảnh thay vì nhận số HR gõ tay
 *    (yêu cầu d9: "Số người phụ thuộc đã nhập ở Gia cảnh => bỏ qua tại đây").
 *    Một con số và một danh sách cùng nói về một thứ thì sớm muộn lệch nhau,
 *    và bên lệch đi thẳng vào giảm trừ gia cảnh trên bảng thuế.
 *
 *    CHỈ suy khi DTO có gửi mảng `nguoiPhuThuoc` lên: `PATCH` chỉ đổi số
 *    điện thoại không mang mảng này, suy bừa là xoá trắng người phụ thuộc.
 * 3. Đổi `userId: ""` (tín hiệu "gỡ liên kết tài khoản" của FE) thành `null`
 *    trước khi ghi xuống Mongo — xem docblock tại nhánh đó ở dưới.
 */
export function chuanHoaHoSo<T extends HoSoCanChuanHoa>(dto: T): T {
  if (Array.isArray(dto.bangCap)) {
    dto.bangCap = dto.bangCap.map((b) => (b.id ? b : { ...b, id: randomUUID() }));
  }
  if (Array.isArray(dto.nguoiPhuThuoc)) {
    dto.nguoiPhuThuoc = dto.nguoiPhuThuoc.map((n) =>
      n.id ? n : { ...n, id: randomUUID() },
    );
    dto.soNguoiPhuThuoc = dto.nguoiPhuThuoc.length;
  }
  /**
   * `""` là TÍN HIỆU của FE, không phải giá trị được phép lưu.
   *
   * FE cố ý gửi chuỗi rỗng thay vì `undefined` để "gỡ liên kết tài khoản"
   * thực sự có hiệu lực (`JSON.stringify` xoá hẳn khoá `undefined`, và
   * `Object.assign` ở `update()` thì không đổi gì) — xem docblock trong
   * `fe/src/pages/nhan-su/ho-so-nhan-vien/components/form/hoSoNhanVienForm.convert.ts`.
   *
   * Nhưng chuỗi rỗng KHÔNG được rơi xuống Mongo: `employees` có chỉ mục
   * unique `{tenantId, userId}` với `partialFilterExpression:
   * {userId: {$type: "string"}}` — dụng ý "chỉ ràng buộc hồ sơ đã gán tài
   * khoản", mà `""` vẫn đúng `$type: "string"`. Hệ quả trên production
   * 2026-09-17: thêm được ĐÚNG MỘT hồ sơ chưa gán tài khoản, hồ sơ thứ hai
   * trở đi nhận `E11000 ... dup key: { tenantId: "...", userId: "" }` ⇒ FE
   * hiện "An unexpected error occurred" ⇒ HR tắc hoàn toàn.
   *
   * `null` không thuộc `$type: "string"` nên nằm ngoài chỉ mục — bao nhiêu
   * hồ sơ chưa gán tài khoản cũng được — mà vẫn là một phép GHI thật, nên
   * thao tác gỡ liên kết vẫn có hiệu lực. `undefined` thì không: TypeORM có
   * thể lược hẳn khoá khỏi `$set` và liên kết cũ sẽ còn nguyên.
   *
   * Chỉ đụng khi DTO CÓ gửi khoá này lên: `undefined` = "không sửa ô đó".
   */
  if (dto.userId === '') {
    (dto as HoSoCanChuanHoa).userId = null;
  }
  return dto;
}
