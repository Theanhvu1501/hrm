import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { OvertimeBalanceRow } from "@/services/overtimeBalanceService";
import { Employee } from "@/services/employeeService";

export interface TableStates extends BaseStates {
  danhSach: OvertimeBalanceRow[];
  employeeList: Employee[];
  // undefined = chưa chọn nhân viên nào — bảng phải hiện trạng thái rỗng
  // "chọn nhân viên" thay vì gọi API (xem init.handler.ts).
  employeeId: string | undefined;
  dangTai: boolean;
}

declare module "../../quyGioHandler" {
  interface QuyGioStates extends TableStates {}
}
