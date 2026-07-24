import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import {
  AttendanceRequest,
  AttendanceRequestType,
  Buoi,
  LoaiNghi,
} from "@/services/attendanceRequestService";

/**
 * Mọi trường đều là chuỗi BẮT BUỘC (không `?`) và mặc định là "" — xem
 * `GIA_TRI_MAC_DINH` ở donChamCongForm.convert.ts.
 *
 * Lý do: react-hook-form giữ nguyên giá trị của ô đã bị ẩn khi HR đổi loại
 * đơn, nên `dungDtoQuanTri()` phải đọc được mọi trường mà không cần
 * `?? ""` rải khắp nơi; và "không điền" luôn là "" chứ không lúc `undefined`
 * lúc "" tuỳ đường vào (tạo mới hay sửa).
 */
export interface DonChamCongFormValues {
  employeeId: string;
  loaiDon: AttendanceRequestType;
  ngay: string;
  /** Ngày cuối khoảng nghỉ — chỉ đơn nghi_phep/nghi_bu dùng. */
  denNgay: string;
  buoi: Buoi;
  /** "" = chưa chọn — Select rỗng, không phải một loại nghỉ hợp lệ nào. */
  loaiNghi: LoaiNghi | "";
  lyDo: string;
  gioTu: string;
  gioDen: string;
  minhChung: string;
  ghiChu: string;
}

export interface FormStates extends BaseStates {
  formVisible: boolean;
  editingRequest: AttendanceRequest | null;
  saving: boolean;
}

declare module "../../donChamCongHandler" {
  interface DonChamCongStates extends FormStates {}
}
