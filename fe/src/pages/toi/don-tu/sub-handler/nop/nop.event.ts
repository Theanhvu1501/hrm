import { BaseEvents } from "@/common";
import { GiaTriFormDon } from "../../truongDon";
import { AttendanceRequestType } from "@/services/attendanceRequestService";

export interface NopEvent extends BaseEvents {
  /** Mở tấm chọn loại đơn (bước 1 — lưới icon kiểu iOS). Xoá lỗi lần trước. */
  moChonLoai: { params: Record<string, never>; result: void };
  /** Đóng tấm chọn loại đơn mà không chọn gì. */
  dongChonLoai: { params: Record<string, never>; result: void };
  /**
   * Chọn một loại đơn ở tấm trên (bước 2): ghi lại loại đã chọn, đóng tấm chọn
   * và mở form của đúng loại đó.
   */
  chonLoai: { params: { loaiDon: AttendanceRequestType }; result: void };
  /** Từ trong form quay lại tấm chọn loại (đổi loại đơn). */
  doiLoai: { params: Record<string, never>; result: void };
  dongForm: { params: Record<string, never>; result: void };
  /**
   * Nộp đơn. Nhận GIÁ TRỊ FORM thô, không nhận DTO: việc lọc trường theo loại
   * đơn nằm ở `dungDtoNopDon()` trong handler, để không có đường nào gửi
   * payload chưa qua lọc lên backend.
   */
  nopDon: { params: GiaTriFormDon; result: void };
}

declare module "../../donTuCuaToiHandler" {
  interface DonTuCuaToiEvents extends NopEvent {}
}
