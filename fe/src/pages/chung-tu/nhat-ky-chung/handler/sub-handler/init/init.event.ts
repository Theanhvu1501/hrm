import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  init: { params: {}; result: void };
  refresh: { params: {}; result: void };
  loadPage: { params: { page: number; limit?: number }; result: void };
  loadStats: { params: {}; result: void };
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends InitEvent {}
}
