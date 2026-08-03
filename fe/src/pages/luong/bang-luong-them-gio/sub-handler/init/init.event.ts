import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  init: { params: Record<string, never>; result: void };
  doiThang: { params: { thang: string }; result: void };
}

declare module "../../bangLuongThemGioHandler" {
  interface BangThemGioEvents extends InitEvent {}
}
