import { BaseEvents } from "@/common";
import { AttendanceRecordFilter } from "@/services/attendanceRecordService";

export interface InitEvent extends BaseEvents {
  init: { params: Record<string, never>; result: void };
  // Đổi bộ lọc đang xem (khoảng ngày / nhân viên / chỉ ngoài vùng) — danh
  // sách được lọc ở BE (xem findAll() trong
  // be/apps/config-service/src/ban-ghi-cham-cong/ban-ghi-cham-cong.service.ts).
  timKiem: { params: AttendanceRecordFilter; result: void };
}

declare module "../../banGhiHandler" {
  interface BanGhiEvents extends InitEvent {}
}
