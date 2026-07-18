import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { Timesheet } from "@/services/timesheetService";

export interface HeaderStates extends BaseStates {
  thang: string;
  timesheetList: Timesheet[];
  generating: boolean;
  finalizing: boolean;
}

declare module "../../bangCongHandler" {
  interface BangCongStates extends HeaderStates {}
}
