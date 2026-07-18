import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { WorkShift } from "@/services/workShiftService";

export interface TableStates extends BaseStates {
  shiftList: WorkShift[];
  loading: boolean;
}

declare module "../../caLamViecHandler" {
  interface CaLamViecStates extends TableStates {}
}
