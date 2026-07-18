import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { EmploymentHistory } from "@/services/employmentHistoryService";
import { Employee } from "@/services/employeeService";

export interface TableStates extends BaseStates {
  historyList: EmploymentHistory[];
  employeeList: Employee[];
  loading: boolean;
}

declare module "../../quaTrinhCongTacHandler" {
  interface QuaTrinhCongTacStates extends TableStates {}
}
