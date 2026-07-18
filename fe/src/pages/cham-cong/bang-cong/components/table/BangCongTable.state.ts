import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { KyHieuDef, Timesheet } from "@/services/timesheetService";

export interface TableStates extends BaseStates {
  timesheetList: Timesheet[];
  kyHieuList: KyHieuDef[];
  loading: boolean;
}

declare module "../../bangCongHandler" {
  interface BangCongStates extends TableStates {}
}
