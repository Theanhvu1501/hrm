import type { NguoiDung } from "@/types";
import type { WorkShift } from "@/services/workShiftService";

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
