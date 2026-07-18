import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  init: { params: {}; result: void };
  refresh: { params: {}; result: void };
}

declare module "../../nhom-khuyen-mai.handler" {
  interface NhomKhuyenMaiEvents extends InitEvent {}
}
