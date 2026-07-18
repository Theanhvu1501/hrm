import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { Timesheet } from "@/services/timesheetService";

export interface TableStates extends BaseStates {
  timesheetList: Timesheet[];
  loading: boolean;
}

declare module "../../bangCongHandler" {
  interface BangCongStates extends TableStates {}
}
