import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  init: { params: Record<string, never>; result: void };
  // Đổi nhân viên đang xem ở ô chọn trên toolbar — bắt buộc phải chọn thì
  // mới tải danh sách, vì `GET /quy-gio` trả mảng RỖNG khi thiếu employeeId
  // (xem quy-gio.controller.ts) chứ không báo lỗi.
  chonNhanVien: { params: { employeeId: string | undefined }; result: void };
}

declare module "../../quyGioHandler" {
  interface QuyGioEvents extends InitEvent {}
}
