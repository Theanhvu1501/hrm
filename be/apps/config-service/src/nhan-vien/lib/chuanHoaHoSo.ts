import { randomUUID } from 'crypto';
import type { BangCap, NguoiPhuThuoc } from '@app/entities';

export interface HoSoCanChuanHoa {
  bangCap?: BangCap[];
  nguoiPhuThuoc?: NguoiPhuThuoc[];
  soNguoiPhuThuoc?: number;
}

/**
 * Hai việc phải làm mỗi lần ghi hồ sơ, tách ra khỏi service để test không cần DB:
 *
 * 1. Gắn `id` cho từng dòng bằng cấp / người phụ thuộc còn thiếu. Tệp đính kèm
 *    bám theo id này; để dòng không có id là dòng đó không đính kèm được.
 * 2. Suy `soNguoiPhuThuoc` từ danh sách Gia cảnh thay vì nhận số HR gõ tay
 *    (yêu cầu d9: "Số người phụ thuộc đã nhập ở Gia cảnh => bỏ qua tại đây").
 *    Một con số và một danh sách cùng nói về một thứ thì sớm muộn lệch nhau,
 *    và bên lệch đi thẳng vào giảm trừ gia cảnh trên bảng thuế.
 *
 * CHỈ suy khi DTO có gửi mảng `nguoiPhuThuoc` lên: `PATCH` chỉ đổi số điện
 * thoại không mang mảng này, suy bừa là xoá trắng người phụ thuộc của hồ sơ.
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
  return dto;
}
