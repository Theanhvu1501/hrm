import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { AttendanceRecord } from "@/services/attendanceRecordService";

export interface LichTuanStates extends BaseStates {
  /** Thứ Hai của tuần đang xem, dạng "YYYY-MM-DD". */
  tuanBatDau: string;
  banGhiTuan: AttendanceRecord[];
  dangTaiTuan: boolean;
  /** Ngày đang được xem trong dải tuần (3 ô + chi tiết đi theo ngày này). */
  ngayDangXem: string;
}

declare module "../chamCongCuaToiHandler" {
  interface ChamCongCuaToiStates extends LichTuanStates {}
}
