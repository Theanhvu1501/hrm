import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  init: { params: {}; result: void };
}

declare module "../../quyChaunHandler" {
  interface QuyChaunEvents extends InitEvent {}
}
