import { BaseEvents } from "@/common";
import { HrNhapChamCongDto } from "@/services/attendanceRecordService";

export interface NhapBuEvent extends BaseEvents {
  openNhapBu: { params: Record<string, never>; result: void };
  closeNhapBu: { params: Record<string, never>; result: void };
  luuNhapBu: { params: HrNhapChamCongDto; result: void };
}

declare module "../../banGhiHandler" {
  interface BanGhiEvents extends NhapBuEvent {}
}
