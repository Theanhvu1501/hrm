import { BaseEvents } from "@/common";
import { ChungTuHeader } from "../init/init.state";

export interface HeaderFormEvent extends BaseEvents {
  updateHeader: { params: { field: keyof ChungTuHeader; value: unknown }; result: void };
  handleLoaiGiaoDichChange: { params: { loaiGiaoDich: string }; result: void };
  handleLoaiChange: { params: { loaiMa: string }; result: void };
}

declare module "../../nhat-ky-chung-form.handler" {
  interface NhatKyChungFormEvents extends HeaderFormEvent {}
}
