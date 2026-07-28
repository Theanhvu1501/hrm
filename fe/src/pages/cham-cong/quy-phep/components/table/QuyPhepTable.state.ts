import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { LeaveBalance } from "@/services/leaveBalanceService";

export interface TableStates extends BaseStates {
  danhSach: LeaveBalance[];
  dangTai: boolean;
  // Năm dùng làm mục tiêu cho hai thao tác hàng loạt (cấp đầu năm / đóng quỹ)
  // ở toolbar — KHÔNG lọc bảng, vì bảng cố tình hiện mọi năm cùng lúc để
  // không gộp nhầm quỹ năm nay với quỹ năm ngoái (xem QuyPhepTable.tsx).
  namLoc: number;
  // null = modal điều chỉnh tay đóng. Đóng modal do HANDLER quyết định (chỉ
  // sau khi lưu thành công) chứ không phải component tự đóng ngay sau khi
  // gọi executeEvent — nếu không, lưu thất bại vẫn đóng modal và người dùng
  // mất luôn số liệu vừa nhập dù đã thấy thông báo lỗi.
  dieuChinhRecord: LeaveBalance | null;
}

declare module "../../quyPhepHandler" {
  interface QuyPhepStates extends TableStates {}
}
