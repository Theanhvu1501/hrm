import { BaseEvents } from "@/common";
import { PhieuConfig } from "../../../phieuConfig";

export interface InitEvent extends BaseEvents {
  init: { params: { config: PhieuConfig }; result: void };
  refresh: { params: {}; result: void };
  loadPage: { params: { page: number; limit?: number }; result: void };
  loadStats: { params: {}; result: void };
  loadMasterData: { params: {}; result: void };
  loadTemplate: { params: {}; result: void };
}

declare module "../../../phieu.handler" {
  interface PhieuEvents extends InitEvent {}
}
