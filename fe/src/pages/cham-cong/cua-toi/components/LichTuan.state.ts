import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { AttendanceRecord } from "@/services/attendanceRecordService";

export interface LichTuanStates extends BaseStates {
  /** Thứ Hai của tuần đang xem, dạng "YYYY-MM-DD". */
  tuanBatDau: string;
  banGhiTuan: AttendanceRecord[];
  dangTaiTuan: boolean;
}

declare module "../chamCongCuaToiHandler" {
  interface ChamCongCuaToiStates extends LichTuanStates {}
}
