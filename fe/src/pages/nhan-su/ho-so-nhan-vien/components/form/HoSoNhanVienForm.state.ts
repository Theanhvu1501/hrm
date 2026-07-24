import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";
import { BangCap, Employee, NguoiPhuThuoc } from "@/services/employeeService";

export interface HoSoNhanVienFormValues {
  hoTen: string;
  cccd: string;
  ngaySinh?: string;
  gioiTinh?: string;
  mst?: string;
  soDienThoai?: string;
  email?: string;
  diaChi?: string;
  bangCap: BangCap[];
  nguoiPhuThuoc: NguoiPhuThuoc[];
  phongBan?: string;
  chucDanh?: string;
  ngayVaoLam?: string;
  loaiHopDong: string;
  trangThai: string;
  userId?: string;
  workShiftId?: string;
  ngayLamViecTrongTuan?: number[];
  choPhepChamNgoaiVung?: boolean;
  luongThoaThuan: number;
  mucKhaiBao?: number;
  phuCapCoDinh: number;
  soNguoiPhuThuoc: number;
  dongBH: boolean;
  thoiVu: boolean;
  camKet: boolean;
}

export interface FormStates extends BaseStates {
  formVisible: boolean;
  editingEmployee: Employee | null;
  saving: boolean;
}

declare module "../../hoSoNhanVienHandler" {
  interface HoSoNhanVienStates extends FormStates {}
}
