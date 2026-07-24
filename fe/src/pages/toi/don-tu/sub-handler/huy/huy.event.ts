import { BaseEvents } from "@/common";

export interface HuyEvent extends BaseEvents {
  /** Huỷ (xoá mềm) một đơn của chính mình — chỉ đơn còn `cho_duyet`. */
  huyDon: { params: { id: string }; result: void };
}

declare module "../../donTuCuaToiHandler" {
  interface DonTuCuaToiEvents extends HuyEvent {}
}
