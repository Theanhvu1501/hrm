import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { EmployeeDevice } from "@/services/employeeDeviceService";

export interface TableStates extends BaseStates {
  deviceList: EmployeeDevice[];
  loading: boolean;
  tab: string;
}

declare module "../../thietBiHandler" {
  interface ThietBiStates extends TableStates {}
}
