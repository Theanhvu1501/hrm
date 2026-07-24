import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { AttendanceRequest } from "@/services/attendanceRequestService";

export interface DanhSachDonStates extends BaseStates {
  danhSach: AttendanceRequest[];
  dangTai: boolean;
  /**
   * Câu lỗi tải danh sách, ĐÃ chốt trong handler để component không phải biết
   * hình dạng lỗi backend. Chuỗi rỗng = không lỗi.
   *
   * Bài học lượt dọn P3.1: lỗi tải mà chỉ `console.error` thì người dùng thấy
   * một màn hình trống y hệt "bạn chưa có đơn nào" — rồi nộp lại đơn đã nộp.
   */
  loiTai: string;
  /** Id đơn đang gửi lệnh huỷ; null = không có. Dùng để khoá đúng một nút. */
  dangHuyId: string | null;
  /** Câu lỗi của lần huỷ gần nhất. Rỗng = không lỗi. */
  loiHuy: string;
}

declare module "../donTuCuaToiHandler" {
  interface DonTuCuaToiStates extends DanhSachDonStates {}
}
