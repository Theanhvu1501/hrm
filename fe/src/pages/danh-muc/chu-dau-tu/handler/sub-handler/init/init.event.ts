import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  init: { params: {}; result: void };
  refresh: { params: {}; result: void };
}

declare module "../../chu-dau-tu.handler" {
  interface ChuDauTuEvents extends InitEvent {}
}
