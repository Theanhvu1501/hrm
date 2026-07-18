import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { Employee } from "@/services/employeeService";

export interface TableStates extends BaseStates {
  employeeList: Employee[];
  loading: boolean;
}

declare module "../../hoSoNhanVienHandler" {
  interface HoSoNhanVienStates extends TableStates {}
}
