import { BaseEvents } from "@/common";

export interface DuyetEvent extends BaseEvents {
  duyetThietBi: { params: { id: string }; result: void };
  tuChoiThietBi: { params: { id: string }; result: void };
  thuHoiThietBi: { params: { id: string; lyDo?: string }; result: void };
}

declare module "../../thietBiHandler" {
  interface ThietBiEvents extends DuyetEvent {}
}
