import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { AttendanceRequest } from "@/services/attendanceRequestService";
import { Employee } from "@/services/employeeService";

export interface TableStates extends BaseStates {
  requestList: AttendanceRequest[];
  employeeList: Employee[];
  loading: boolean;
}

declare module "../../donChamCongHandler" {
  interface DonChamCongStates extends TableStates {}
}
