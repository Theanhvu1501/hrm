import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { LaborContract } from "@/services/laborContractService";

export interface HopDongLaoDongFormValues {
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  loaiHopDong: string;
  ngayBatDau?: string;
  ngayKetThuc?: string;
  mucLuong?: number;
  phuCap?: number;
  hinhThucTraLuong?: string;
  trangThai: string;
  ghiChu?: string;
}

export interface FormStates extends BaseStates {
  formVisible: boolean;
  editingContract: LaborContract | null;
  saving: boolean;
}

declare module "../../hopDongLaoDongHandler" {
  interface HopDongLaoDongStates extends FormStates {}
}
