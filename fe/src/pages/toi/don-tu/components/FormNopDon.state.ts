import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";

export interface FormNopDonStates extends BaseStates {
  formMo: boolean;
  dangGui: boolean;
  /**
   * Câu lỗi của lần nộp gần nhất (validate ở FE hoặc lỗi backend trả về),
   * hiện ngay trong form chứ không phải toast: người dùng còn đang đứng trong
   * form và cần sửa lại ô nào đó, đóng form đi rồi mới báo lỗi là mất hết
   * những gì họ vừa gõ.
   */
  loiGui: string;
}

declare module "../donTuCuaToiHandler" {
  interface DonTuCuaToiStates extends FormNopDonStates {}
}
