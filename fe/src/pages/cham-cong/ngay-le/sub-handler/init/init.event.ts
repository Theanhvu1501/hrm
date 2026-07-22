import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  init: { params: Record<string, never>; result: void };
  // Đổi năm đang xem — danh sách ngày lễ được lọc theo `nam` ở BE
  // (xem be/apps/config-service/src/ngay-le/ngay-le.service.ts).
  doiNam: { params: { nam: number }; result: void };
}

declare module "../../ngayLeHandler" {
  interface NgayLeEvents extends InitEvent {}
}
