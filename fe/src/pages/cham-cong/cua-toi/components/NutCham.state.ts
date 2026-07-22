import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import {
  AttendanceRecord,
  TrangThaiHomNay,
} from "@/services/attendanceRecordService";
import { TrangThai } from "../trangThai";

export interface NutChamStates extends BaseStates {
  homNay: TrangThaiHomNay | null;
  trangThai: TrangThai;
  dangCham: boolean;
  banGhiVuaTao: AttendanceRecord | null;
  /**
   * Câu đã chốt để hiện lên màn hình, tính sẵn trong handler bằng
   * thongDiepChoTrangThai(). Cố ý KHÔNG giữ đối tượng lỗi trong state:
   * component không phải biết hình dạng lỗi của backend.
   */
  thongBao: string;
}

declare module "../chamCongCuaToiHandler" {
  interface ChamCongCuaToiStates extends NutChamStates {}
}
