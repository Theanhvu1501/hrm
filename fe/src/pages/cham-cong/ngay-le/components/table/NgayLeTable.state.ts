import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { Holiday } from "@/services/holidayService";

export interface TableStates extends BaseStates {
  holidayList: Holiday[];
  loading: boolean;
  nam: number;
}

declare module "../../ngayLeHandler" {
  interface NgayLeStates extends TableStates {}
}
