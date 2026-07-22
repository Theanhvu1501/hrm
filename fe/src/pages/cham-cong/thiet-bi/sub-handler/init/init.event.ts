import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  init: { params: Record<string, never>; result: void };
  // Đổi tab đang xem — danh sách được lọc theo trạng thái ở BE
  // (xem be/apps/config-service/src/thiet-bi-cham-cong/thiet-bi-cham-cong.service.ts findAll()).
  doiTab: { params: { trangThai: string }; result: void };
}

declare module "../../thietBiHandler" {
  interface ThietBiEvents extends InitEvent {}
}
