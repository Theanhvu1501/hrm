import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { AttendanceLocation } from "@/services/attendanceLocationService";

export interface DiaDiemChamCongFormValues {
  ten: string;
  loai: "gps" | "wifi" | "qr";
  latitude?: number;
  longitude?: number;
  banKinh?: number;
  ipWifi?: string;
  maQr?: string;
  diaChi?: string;
  chiNhanh?: string;
  phongBan?: string;
}

export interface FormStates extends BaseStates {
  formVisible: boolean;
  editingLocation: AttendanceLocation | null;
  saving: boolean;
}

declare module "../../diaDiemChamCongHandler" {
  interface DiaDiemChamCongStates extends FormStates {}
}
