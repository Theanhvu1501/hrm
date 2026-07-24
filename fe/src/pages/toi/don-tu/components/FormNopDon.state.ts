import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { AttendanceRequestType } from "@/services/attendanceRequestService";

export interface FormNopDonStates extends BaseStates {
  /**
   * Tấm chọn loại đơn (lưới icon kiểu iOS) đang mở. Người dùng chọn LOẠI ĐƠN
   * trước, chọn xong mới mở form — form không còn ô "Loại đơn" bên trong nữa.
   */
  chonLoaiMo: boolean;
  /**
   * Loại đơn đã chọn ở tấm trên. Form khởi tạo và tự quyết bộ trường theo giá
   * trị này. Rỗng khi chưa chọn gì (form đóng).
   */
  loaiDaChon: AttendanceRequestType | "";
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
