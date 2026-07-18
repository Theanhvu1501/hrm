import { LoaiChungTu } from "@/types";
import { ServiceBase } from "./base/service-base";

export interface PhieuTemplateData {
  loai: LoaiChungTu;
  html: string;
}

class PhieuTemplateService extends ServiceBase {
  constructor() {
    super({ endpoint: "/config/phieu-template" });
  }

  /** Lấy mẫu in theo loại; null nếu chưa cấu hình (FE dùng mẫu mặc định). */
  async getByLoai(loai: LoaiChungTu): Promise<PhieuTemplateData | null> {
    return this.get<PhieuTemplateData | null>({ endpoint: `/${loai}` });
  }

  /** Lưu (upload) mẫu in cho 1 loại. */
  async upsert(loai: LoaiChungTu, html: string): Promise<PhieuTemplateData> {
    return this.put<PhieuTemplateData>({ html }, { endpoint: `/${loai}` });
  }

  /** Xoá mẫu in (về mặc định). */
  async remove(loai: LoaiChungTu): Promise<void> {
    await this.delete({ endpoint: `/${loai}` });
  }
}

export const phieuTemplateService = new PhieuTemplateService();
