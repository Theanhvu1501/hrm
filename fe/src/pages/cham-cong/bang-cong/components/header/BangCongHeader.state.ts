import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { Timesheet } from "@/services/timesheetService";

export interface HeaderStates extends BaseStates {
  thang: string;
  timesheetList: Timesheet[];
  generating: boolean;
  finalizing: boolean;
  // Cờ loading riêng cho "Mở lại" — không dùng chung `finalizing` vì đây là
  // thao tác ngược lại (mở khoá), không phải chốt, và có thể xảy ra cùng lúc
  // với các nút khác đang bận nếu HR bấm nhanh.
  reopening: boolean;
}

declare module "../../bangCongHandler" {
  interface BangCongStates extends HeaderStates {}
}
