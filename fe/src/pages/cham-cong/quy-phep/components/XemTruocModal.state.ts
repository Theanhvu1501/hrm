import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { DongXemTruocCap, DongXemTruocDong } from "@/services/leaveBalanceService";

export type XemTruocLoai = "cap_dau_nam" | "dong_quy";

/**
 * Dữ liệu xem trước một trong hai thao tác hàng loạt. `capRows`/`dongRows`
 * loại trừ lẫn nhau tuỳ `loai` — tách hẳn hai mảng thay vì union chung một
 * kiểu row để bảng xem trước không phải đoán field nào tồn tại.
 */
export interface XemTruocData {
  loai: XemTruocLoai;
  nam: number;
  capRows: DongXemTruocCap[];
  dongRows: DongXemTruocDong[];
}

export interface XemTruocModalStates extends BaseStates {
  // null = modal đóng. Đây là NGUỒN DUY NHẤT quyết định modal mở hay đóng —
  // không có state `modalVisible` rời để tránh lệch giữa "đang mở" và "có
  // dữ liệu xem trước hay chưa".
  xemTruoc: XemTruocData | null;
  dangXuLy: boolean;
}

declare module "../quyPhepHandler" {
  interface QuyPhepStates extends XemTruocModalStates {}
}
