import { BaseEvents } from "@/common";

export interface InitFormEvent extends BaseEvents {
  init: { params: { soPhieu?: string }; result: void };
  loadMasterData: { params: {}; result: void };
}

declare module "../../nhat-ky-chung-form.handler" {
  interface NhatKyChungFormEvents extends InitFormEvent {}
}
