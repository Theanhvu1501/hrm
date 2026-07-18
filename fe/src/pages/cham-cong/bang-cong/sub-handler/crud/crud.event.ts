import { BaseEvents } from "@/common";
import { UpdateTimesheetDto } from "@/services/timesheetService";

export interface CrudEvent extends BaseEvents {
  generateBangCong: { params: { thang: string }; result: void };
  updateRow: {
    params: { id: string; dto: UpdateTimesheetDto };
    result: void;
  };
  setDay: {
    params: { id: string; ngay: number; kyHieu: string };
    result: void;
  };
  finalizeBangCong: { params: { thang: string }; result: void };
}

declare module "../../bangCongHandler" {
  interface BangCongEvents extends CrudEvent {}
}
