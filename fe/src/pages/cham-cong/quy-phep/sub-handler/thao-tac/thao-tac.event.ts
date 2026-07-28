import { BaseEvents } from "@/common";
import { DieuChinhQuyPhepDto, LeaveBalance } from "@/services/leaveBalanceService";
import { XemTruocLoai } from "../../components/XemTruocModal.state";

export interface ThaoTacEvent extends BaseEvents {
  // Mở modal xem trước — LUÔN gọi service với xemTruoc:true. Đây là cửa DUY
  // NHẤT dẫn tới ghi dữ liệu: xacNhanXemTruoc chỉ đọc state do event này set,
  // không nhận nam/loai từ nơi khác — nên không có đường nào bấm thẳng nút
  // mà bỏ qua bước xem trước.
  moXemTruoc: { params: { loai: XemTruocLoai; nam: number }; result: void };
  // Xác nhận sau khi đã xem trước — gọi lại đúng service với xemTruoc:false.
  xacNhanXemTruoc: { params: Record<string, never>; result: void };
  huyXemTruoc: { params: Record<string, never>; result: void };
  moDieuChinh: { params: { record: LeaveBalance }; result: void };
  dongDieuChinh: { params: Record<string, never>; result: void };
  dieuChinh: { params: DieuChinhQuyPhepDto; result: void };
  moSoBienDong: { params: { quy: LeaveBalance }; result: void };
  dongSoBienDong: { params: Record<string, never>; result: void };
}

declare module "../../quyPhepHandler" {
  interface QuyPhepEvents extends ThaoTacEvent {}
}
