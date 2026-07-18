import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  init: { params: Record<string, never>; result: void };
  changeThang: { params: { thang: string }; result: void };
}

declare module "../../bangCongHandler" {
  interface BangCongEvents extends InitEvent {}
}
