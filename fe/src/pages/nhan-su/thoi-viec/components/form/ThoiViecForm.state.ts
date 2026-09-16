import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { Resignation } from "@/services/resignationService";

export interface ChecklistBanGiaoFormItem {
  noiDung: string;
  hoanThanh: boolean;
}

export interface ThoiViecFormValues {
  employeeId: string;
  ngayNopDon: string;
  ngayLamViecCuoi?: string;
  loaiThoiViec: string;
  lyDo?: string;
  viPham?: string;
  checklistBanGiao: ChecklistBanGiaoFormItem[];
  soQuyetDinh?: string;
  ghiChu?: string;
  /** Cần tuyển người thay cho vị trí này (yêu cầu d14). */
  canTuyenThayThe?: boolean;
  ghiChuTuyenDung?: string;
}

export interface FormStates extends BaseStates {
  formVisible: boolean;
  editingResignation: Resignation | null;
  saving: boolean;
}

declare module "../../thoiViecHandler" {
  interface ThoiViecStates extends FormStates {}
}
