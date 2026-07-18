import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { WorkShift } from "@/services/workShiftService";

export interface CaLamViecFormValues {
  ten: string;
  gioBatDau: string;
  gioKetThuc: string;
  gioNghiTu?: string;
  gioNghiDen?: string;
  laLinhHoat: boolean;
  soPhutLinhHoat?: number;
  moTa?: string;
}

export interface FormStates extends BaseStates {
  formVisible: boolean;
  editingShift: WorkShift | null;
  saving: boolean;
}

declare module "../../caLamViecHandler" {
  interface CaLamViecStates extends FormStates {}
}
