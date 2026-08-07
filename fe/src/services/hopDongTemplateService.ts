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

/**
 * Một mẫu in hợp đồng. Nhiều mẫu mỗi tenant — cùng một hợp đồng có thể cần
 * in ra nhiều dạng (thử việc, chính thức, dịch vụ…), nên mẫu do người in
 * chọn tại chỗ chứ không gắn cứng vào `loaiHopDong` của dữ liệu.
 */
export interface MauInHopDong {
  id: string;
  ten: string;
  html: string;
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

  async dsMauIn(): Promise<MauInHopDong[]> {
    const res = await this.get<Array<Record<string, unknown>>>({
      endpoint: "/mau-in",
    });
    return res.map((x) => ({
      id: (x._id as string) || (x.id as string),
      ten: x.ten as string,
      html: x.html as string,
    }));
  }

  async themMauIn(ten: string, html: string): Promise<MauInHopDong> {
    const res = await this.post<Record<string, unknown>>(
      { ten, html },
      { endpoint: "/mau-in" },
    );
    return {
      id: (res._id as string) || (res.id as string),
      ten: res.ten as string,
      html: res.html as string,
    };
  }

  async suaMauIn(
    id: string,
    dto: { ten?: string; html?: string },
  ): Promise<MauInHopDong> {
    const res = await this.put<Record<string, unknown>>(dto, {
      endpoint: `/mau-in/${id}`,
    });
    return {
      id: (res._id as string) || (res.id as string),
      ten: res.ten as string,
      html: res.html as string,
    };
  }

  async xoaMauIn(id: string): Promise<void> {
    await this.delete({ endpoint: `/mau-in/${id}` });
  }

  async getThongTinCongTy(): Promise<ThongTinCongTy> {
    return this.get<ThongTinCongTy>({ endpoint: "/cong-ty" });
  }

  async upsertThongTinCongTy(dto: UpdateThongTinCongTyDto): Promise<ThongTinCongTy> {
    return this.put<ThongTinCongTy>(dto, { endpoint: "/cong-ty" });
  }

  /**
   * Ghép dữ liệu 1 hợp đồng (theo id) vào mẫu in → HTML sẵn sàng in.
   *
   * `mauInId` bỏ trống thì BE lấy mẫu đầu danh sách — đủ cho lần mở đầu tiên,
   * trước khi người dùng kịp chọn mẫu.
   */
  async render(id: string, mauInId?: string): Promise<HopDongRendered> {
    return this.get<HopDongRendered>({
      endpoint: `/${id}/in`,
      params: mauInId ? { mauInId } : undefined,
    });
  }
}

export const hopDongTemplateService = new HopDongTemplateService();
