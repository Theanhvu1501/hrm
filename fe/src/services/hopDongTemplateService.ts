import { ServiceBase } from "./base/service-base";

/** Thông tin công ty dùng làm tiêu đề khi in hợp đồng lao động (letterhead). */
export interface ThongTinCongTy {
  tenCongTy: string | null;
  diaChiCongTy: string | null;
  maSoThue: string | null;
  nguoiDaiDien: string | null;
  chucVuNguoiDaiDien: string | null;
  /** Thành phố ký hợp đồng (dòng quốc hiệu đầu văn bản) — trước bản vá hard-code "Hà Nội" cho mọi tenant. */
  thanhPhoKy: string | null;
  /** Hậu tố số hợp đồng mẫu (vd "/HĐLĐ-MC.1") — trước bản vá hard-code cho mọi tenant. */
  maHopDongMau: string | null;
}

export type UpdateThongTinCongTyDto = Partial<Omit<ThongTinCongTy, never>>;

export interface MauInHopDong {
  html: string;
  /** true = tenant đã tự soạn mẫu riêng; false = đang dùng mẫu mặc định dựng sẵn. */
  isCustom: boolean;
}

export interface HopDongRendered {
  /** HTML đã ghép đủ dữ liệu, sẵn sàng in. */
  html: string;
  /** Khoảng trống KHÔNG do cố ý (thiếu dữ liệu hồ sơ/công ty) — hiện cảnh báo trước khi in. */
  canhBao: string[];
}

/**
 * Mẫu in hợp đồng lao động + thông tin công ty (letterhead) + render 1 hợp
 * đồng cụ thể ra HTML để in. Dùng chung endpoint `/config/hop-dong` với
 * `laborContractService` — các route này nằm trong `hop-dong.controller.ts`
 * ở BE (không phải `/config/phieu-template`, xem chú thích tại
 * `LoaiPhieuTemplate` vì sao).
 */
class HopDongTemplateService extends ServiceBase {
  constructor() {
    super({ endpoint: "/config/hop-dong" });
  }

  async getMauIn(): Promise<MauInHopDong> {
    return this.get<MauInHopDong>({ endpoint: "/mau-in" });
  }

  async upsertMauIn(html: string): Promise<{ html: string }> {
    return this.put<{ html: string }>({ html }, { endpoint: "/mau-in" });
  }

  async removeMauIn(): Promise<void> {
    await this.delete({ endpoint: "/mau-in" });
  }

  async getThongTinCongTy(): Promise<ThongTinCongTy> {
    return this.get<ThongTinCongTy>({ endpoint: "/cong-ty" });
  }

  async upsertThongTinCongTy(dto: UpdateThongTinCongTyDto): Promise<ThongTinCongTy> {
    return this.put<ThongTinCongTy>(dto, { endpoint: "/cong-ty" });
  }

  /** Ghép dữ liệu 1 hợp đồng (theo id) vào mẫu in → HTML sẵn sàng in. */
  async render(id: string): Promise<HopDongRendered> {
    return this.get<HopDongRendered>({ endpoint: `/${id}/in` });
  }
}

export const hopDongTemplateService = new HopDongTemplateService();
