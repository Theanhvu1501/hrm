import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { LeaveBalance, LeaveBalanceEntry } from "@/services/leaveBalanceService";

export interface SoBienDongDrawerStates extends BaseStates {
  // null = drawer đóng — cũng là quỹ đang xem, để hiện tiêu đề (mã NV/năm).
  drawerQuy: LeaveBalance | null;
  bienDong: LeaveBalanceEntry[];
  dangTaiBienDong: boolean;
}

declare module "../quyPhepHandler" {
  interface QuyPhepStates extends SoBienDongDrawerStates {}
}
