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
  // Mốc "lên chính thức" — khoá mở quỹ phép năm (BE Task 7). KHÔNG dùng để
  // tính số ngày phép/thâm niên: hai thứ đó luôn tính từ `ngayVaoLam`.
  ngayChinhThuc?: string;
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
  hopDongThu2: boolean;
  // 4 ô "cấu hình riêng" — phẳng cho react-hook-form; ô % ở đây là PHẦN TRĂM
  // (90), quy đổi sang tỷ lệ 0..1 trong `tabs/luongTab.convert.ts`.
  orCongChuan?: number;
  orThuViecPhanTram?: number;
  orBhxhPhanTram?: number;
  orBhxhCanCu?: "MUC_KHAI_BAO" | "LUONG_THOA_THUAN";
}

export interface FormStates extends BaseStates {
  formVisible: boolean;
  editingEmployee: Employee | null;
  saving: boolean;
}

declare module "../../hoSoNhanVienHandler" {
  interface HoSoNhanVienStates extends FormStates {}
}
