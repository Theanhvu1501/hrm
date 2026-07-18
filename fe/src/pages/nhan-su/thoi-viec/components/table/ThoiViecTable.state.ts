import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { Resignation } from "@/services/resignationService";
import { Employee } from "@/services/employeeService";

export interface TableStates extends BaseStates {
  resignationList: Resignation[];
  employeeList: Employee[];
  loading: boolean;
}

declare module "../../thoiViecHandler" {
  interface ThoiViecStates extends TableStates {}
}
