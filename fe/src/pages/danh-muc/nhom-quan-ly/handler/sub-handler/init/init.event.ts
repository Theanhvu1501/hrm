import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  init: { params: {}; result: void };
  refresh: { params: {}; result: void };
}

declare module "../../nhom-quan-ly.handler" {
  interface NhomQuanLyEvents extends InitEvent {}
}
