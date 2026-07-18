import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { AttendanceLocation } from "@/services/attendanceLocationService";

export interface TableStates extends BaseStates {
  locationList: AttendanceLocation[];
  loading: boolean;
}

declare module "../../diaDiemChamCongHandler" {
  interface DiaDiemChamCongStates extends TableStates {}
}
