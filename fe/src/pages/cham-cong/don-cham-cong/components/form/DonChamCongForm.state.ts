import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { AttendanceRequest } from "@/services/attendanceRequestService";

export interface DonChamCongFormValues {
  employeeId: string;
  loaiDon: "giai_trinh" | "lam_them_gio";
  ngay: string;
  lyDo?: string;
  gioTu?: string;
  gioDen?: string;
  minhChung?: string;
  ghiChu?: string;
}

export interface FormStates extends BaseStates {
  formVisible: boolean;
  editingRequest: AttendanceRequest | null;
  saving: boolean;
}

declare module "../../donChamCongHandler" {
  interface DonChamCongStates extends FormStates {}
}
