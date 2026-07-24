import { BaseEvents } from "@/common";

export interface TongHopEvent extends BaseEvents {
  tongHop: { params: { thang: string }; result: void };
}

declare module "../../bangLuongHandler" {
  interface BangLuongEvents extends TongHopEvent {}
}
