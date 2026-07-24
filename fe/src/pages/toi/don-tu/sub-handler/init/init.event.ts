import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  /** Nạp (hoặc nạp lại) danh sách đơn của chính mình. */
  init: { params: Record<string, never>; result: void };
}

declare module "../../donTuCuaToiHandler" {
  interface DonTuCuaToiEvents extends InitEvent {}
}
