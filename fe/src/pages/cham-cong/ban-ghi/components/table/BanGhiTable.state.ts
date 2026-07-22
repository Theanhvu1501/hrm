import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import {
  AttendanceRecord,
  AttendanceRecordFilter,
} from "@/services/attendanceRecordService";
import { Employee } from "@/services/employeeService";

export interface TableStates extends BaseStates {
  recordList: AttendanceRecord[];
  employeeList: Employee[];
  filter: AttendanceRecordFilter;
  loading: boolean;
}

declare module "../../banGhiHandler" {
  interface BanGhiStates extends TableStates {}
}
