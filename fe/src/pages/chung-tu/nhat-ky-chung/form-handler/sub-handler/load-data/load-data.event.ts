import { BaseEvents } from "@/common";

export interface LoadDataFormEvent extends BaseEvents {
  loadDataBySoPhieu: { params: { soPhieu: string }; result: void };
}

declare module "../../nhat-ky-chung-form.handler" {
  interface NhatKyChungFormEvents extends LoadDataFormEvent {}
}
