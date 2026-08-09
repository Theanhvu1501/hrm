import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { EmploymentHistory } from "@/services/employmentHistoryService";

export interface QuaTrinhCongTacFormValues {
  employeeId: string;
  loaiThayDoi: string;
  ngayHieuLuc: string;
  departmentIdMoi?: string;
  chucDanhMoi?: string;
  trangThaiMoi?: string;
  mucLuongMoi?: number;
  soQuyetDinh?: string;
  lyDo?: string;
  ghiChu?: string;
}

export interface FormStates extends BaseStates {
  formVisible: boolean;
  editingHistory: EmploymentHistory | null;
  saving: boolean;
}

declare module "../../quaTrinhCongTacHandler" {
  interface QuaTrinhCongTacStates extends FormStates {}
}
