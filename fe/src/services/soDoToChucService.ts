import { ServiceBase } from "./base/service-base";

export type LoaiDonVi = "khoi" | "phong_ban" | "bo_phan" | "chuc_danh";

export const LOAI_DON_VI_OPTIONS: { value: LoaiDonVi; label: string }[] = [
  { value: "khoi", label: "Khối" },
  { value: "phong_ban", label: "Phòng ban" },
  { value: "bo_phan", label: "Bộ phận" },
  { value: "chuc_danh", label: "Chức danh" },
];

export interface NutToChuc {
  id: string;
  ten: string;
  loai: LoaiDonVi;
  parentId: string | null;
  thuTu: number;
  vaiTro?: string;
  departmentId?: string | null;
  moTa?: string;
  con: NutToChuc[];
}

/** Một chức danh (lá của cây) để đổ vào ô chọn ở hồ sơ / quá trình công tác. */
export interface ChucDanhChon {
  id: string;
  ten: string;
  /** "Khối Kinh doanh / Phòng Bán hàng / Trưởng phòng" */
  duongDan: string;
  vaiTro?: string;
  departmentId?: string | null;
}

export interface LuuDonViDto {
  ten: string;
  loai?: LoaiDonVi;
  parentId?: string | null;
  thuTu?: number;
  vaiTro?: string;
  departmentId?: string | null;
  moTa?: string;
}

class SoDoToChucService extends ServiceBase {
  constructor() {
    super({ endpoint: "/config/so-do-to-chuc" });
  }

  cay(): Promise<NutToChuc[]> {
    return this.get<NutToChuc[]>();
  }

  /**
   * Quyền của endpoint này là quyền MÀN HỒ SƠ (`/nhan-su/ho-so-nhan-vien:xem`),
   * không phải quyền quản trị sơ đồ tổ chức — HR nhập hồ sơ vẫn chọn được chức
   * danh dù không được cấp quyền dựng sơ đồ.
   */
  chucDanh(): Promise<ChucDanhChon[]> {
    return this.get<ChucDanhChon[]>({ endpoint: "/chuc-danh" });
  }

  them(dto: LuuDonViDto): Promise<NutToChuc> {
    return this.post<NutToChuc>(dto);
  }

  sua(id: string, dto: LuuDonViDto): Promise<NutToChuc> {
    return this.put<NutToChuc>(dto, { endpoint: `/${id}` });
  }

  xoa(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }
}

export const soDoToChucService = new SoDoToChucService();
