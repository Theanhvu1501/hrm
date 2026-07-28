import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { AttendanceRequest } from "@/services/attendanceRequestService";
import { LeaveBalance } from "@/services/leaveBalanceService";

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
  /**
   * Số dư phép năm của chính mình (P3.8, Task 12) — nạp cùng lúc với
   * `danhSach` ở `init.handler.ts` để đầu trang và form nộp đơn (nghỉ
   * phép/phép năm) đọc chung MỘT lần tải, không phải mỗi nơi tự gọi lại
   * `leaveBalanceService.getCuaToi()`. Lỗi tải quỹ KHÔNG chặn xem/nộp các
   * loại đơn khác — rỗng khi lỗi (component tự hiện "Chưa có quỹ phép năm",
   * xem KhoiSoDuPhep).
   */
  soDuPhep: LeaveBalance[];
}

declare module "../donTuCuaToiHandler" {
  interface DonTuCuaToiStates extends DanhSachDonStates {}
}
