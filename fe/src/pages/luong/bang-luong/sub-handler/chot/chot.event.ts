import { BaseEvents } from "@/common";

export interface ChotEvent extends BaseEvents {
  chot: { params: { thang: string }; result: void };
  moLai: { params: { thang: string }; result: void };
}

declare module "../../bangLuongHandler" {
  interface BangLuongEvents extends ChotEvent {}
}
