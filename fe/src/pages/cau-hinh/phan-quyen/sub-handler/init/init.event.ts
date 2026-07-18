import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  init: { params: Record<string, never>; result: void };
}

declare module "../../phanQuyenHandler" {
  interface PhanQuyenEvents extends InitEvent {}
}
