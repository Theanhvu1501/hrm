import type { NguoiDung } from "@/types";
import type { WorkShift } from "@/services/workShiftService";
import type { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";

/**
 * Thứ trong tuần, xếp hiển thị T2→CN (tự nhiên với người Việt) nhưng `value`
 * theo đúng quy ước `Date.getDay()` mà backend dùng để suy ngày nghỉ:
 * 0=CN, 1=T2, … 6=T7. KHÔNG được sắp xếp lại mảng này theo value.
 */
export const NGAY_TRONG_TUAN_OPTIONS = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
];

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Danh sách tài khoản cho ô "Tài khoản đăng nhập". `value` phải là `nd.id`
 * — đây là trường mà `nguoiDungService` gán từ `sub` của identity (xem
 * `transformUser` trong nguoiDungService.ts và `mapToUserWithTenant` ở BE:
 * `id: user.id` lấy nguyên từ identity, cùng giá trị `JwtGuard` gán vào
 * `req.user.id` từ `decoded.sub`). Đây chính là giá trị `Employee.userId`
 * cần lưu để `resolveEmployeeFromUser` khớp được.
 */
export function nguoiDungToUserOptions(list: NguoiDung[]): SelectOption[] {
  return list.map((nd) => ({
    value: nd.id,
    label: `${nd.hoTen} — ${nd.email}`,
  }));
}

export function workShiftToOptions(list: WorkShift[]): SelectOption[] {
  return list.map((ws) => ({
    value: ws.id,
    label: `${ws.ten} (${ws.gioBatDau}–${ws.gioKetThuc})`,
  }));
}

/**
 * Rút gọn phần DTO cho công tắc "Cho phép chấm công ngoài khu vực".
 *
 * BẪY (đã gặp ở P3.1 với `ngayLamViecTrongTuan`): `ServiceBase` gửi request
 * bằng `JSON.stringify`, mà `JSON.stringify` loại thẳng khoá mang giá trị
 * `undefined` khỏi body; BE lại cập nhật kiểu `Object.assign(item, dto)` nên
 * khoá vắng mặt nghĩa là "giữ nguyên giá trị cũ". Nếu hàm này trả về
 * `undefined` khi form chưa từng có trường (hồ sơ cũ) hoặc khi HR vừa bỏ
 * tick, thì:
 *   - bỏ tick xong bấm lưu → màn hình báo "Cập nhật thành công" nhưng nhân
 *     viên vẫn được phép chấm công ngoài vùng như trước (quyền không bị
 *     thu hồi);
 *   - hồ sơ chưa từng cấu hình trường này sẽ không tự nhận giá trị mặc định
 *     an toàn (`false`) khi lưu lần đầu.
 * Vì vậy: chỉ coi là "bật" khi giá trị đúng bằng `true` (không dùng `||`),
 * mọi trường hợp khác (`false`, `undefined`, hồ sơ chưa có trường) đều ép
 * thành `false` thật — luôn có mặt trong object trả về.
 */
export function choPhepChamNgoaiVungToDto(
  values: Pick<HoSoNhanVienFormValues, "choPhepChamNgoaiVung">
): { choPhepChamNgoaiVung: boolean } {
  return { choPhepChamNgoaiVung: values.choPhepChamNgoaiVung === true };
}
