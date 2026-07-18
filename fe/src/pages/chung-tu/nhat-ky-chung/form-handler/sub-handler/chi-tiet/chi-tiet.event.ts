import { BaseEvents } from "@/common";
import { ChungTuChiTiet } from "../init/init.state";

export interface ChiTietFormEvent extends BaseEvents {
  addChiTiet: { params: {}; result: void };
  removeChiTiet: { params: { key: string }; result: void };
  updateChiTiet: { params: { key: string; field: keyof ChungTuChiTiet; value: unknown }; result: void };
  updateChiTietSnapshot: { params: { key: string; snapshotField: string; snapshot: Record<string, unknown> }; result: void };
  duplicateChiTiet: { params: { key: string }; result: void };
  handleNghiepVuChange: { params: { key: string; nghiepVu: string }; result: void };
}

declare module "../../nhat-ky-chung-form.handler" {
  interface NhatKyChungFormEvents extends ChiTietFormEvent {}
}
