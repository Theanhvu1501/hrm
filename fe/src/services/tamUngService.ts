import { ServiceBase } from "./base/service-base";

export type TrangThaiTamUng = "cho_duyet" | "da_duyet" | "tu_choi";

export interface TamUngLuong {
  _id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  /** Kỳ lương sẽ trừ, 'YYYY-MM'. */
  thang: string;
  ngayDeNghi: string;
  soTien: number;
  lyDo?: string;
  trangThai: TrangThaiTamUng;
  nguoiDuyet?: string;
  ngayDuyet?: string;
  lyDoTuChoi?: string;
  ghiChu?: string;
  isActive: boolean;
}

export interface TamUngFilter {
  thang?: string;
  employeeId?: string;
  trangThai?: string;
}

export interface TaoTamUngDto {
  /** Bỏ trống ở đường tự phục vụ — BE lấy người đang đăng nhập. */
  employeeId?: string;
  thang: string;
  ngayDeNghi: string;
  soTien: number;
  lyDo: string;
  ghiChu?: string;
}

class TamUngService extends ServiceBase {
  constructor() {
    super({ endpoint: "/config/tam-ung" });
  }

  danhSach(filter?: TamUngFilter): Promise<TamUngLuong[]> {
    return this.get<TamUngLuong[]>({ params: filter });
  }

  tao(dto: TaoTamUngDto): Promise<TamUngLuong> {
    return this.post<TamUngLuong>(dto);
  }

  duyet(
    id: string,
    trangThai: "da_duyet" | "tu_choi",
    lyDoTuChoi?: string,
  ): Promise<TamUngLuong> {
    return this.patch<TamUngLuong>(
      { trangThai, lyDoTuChoi },
      { endpoint: `/${id}/duyet` },
    );
  }

  huy(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  // ── Tự phục vụ (vỏ /toi) ──────────────────────────────────────────────
  cuaToi(): Promise<TamUngLuong[]> {
    return this.get<TamUngLuong[]>({ endpoint: "/cua-toi" });
  }

  taoCuaToi(dto: TaoTamUngDto): Promise<TamUngLuong> {
    return this.post<TamUngLuong>(dto, { endpoint: "/cua-toi" });
  }

  huyCuaToi(id: string): Promise<void> {
    return super.delete({ endpoint: `/cua-toi/${id}` });
  }
}

export const tamUngService = new TamUngService();

export const TRANG_THAI_TAM_UNG_LABEL: Record<string, string> = {
  cho_duyet: "Chờ duyệt",
  da_duyet: "Đã duyệt",
  tu_choi: "Từ chối",
};
