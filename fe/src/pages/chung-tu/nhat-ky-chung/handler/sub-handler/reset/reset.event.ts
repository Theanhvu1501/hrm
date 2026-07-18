import { BaseEvents } from "@/common";

export interface ResetEvent extends BaseEvents {
  resetFilters: { params: {}; result: void };
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends ResetEvent {}
}
