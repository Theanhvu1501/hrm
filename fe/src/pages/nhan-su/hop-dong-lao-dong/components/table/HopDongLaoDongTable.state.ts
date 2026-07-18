import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { LaborContract } from "@/services/laborContractService";
import { Employee } from "@/services/employeeService";

export interface TableStates extends BaseStates {
  contractList: LaborContract[];
  employeeList: Employee[];
  loading: boolean;
}

declare module "../../hopDongLaoDongHandler" {
  interface HopDongLaoDongStates extends TableStates {}
}
