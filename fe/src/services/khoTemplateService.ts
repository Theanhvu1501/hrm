import { ServiceBase } from './base/service-base';

export interface KhoTemplateData {
  loai: string;
  html: string;
}

/**
 * Mẫu in cho phiếu kho — tái dùng store template chung của config-service
 * (/config/phieu-template/:loai), với loai = KHO_NHAP | KHO_XUAT | KHO_CHUYEN.
 */
class KhoTemplateService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/phieu-template' });
  }

  /** Lấy mẫu in theo key; null nếu chưa cấu hình (FE dùng mẫu mặc định). */
  async getByLoai(loai: string): Promise<KhoTemplateData | null> {
    return this.get<KhoTemplateData | null>({ endpoint: `/${loai}` });
  }

  /** Lưu mẫu in cho 1 loại. */
  async upsert(loai: string, html: string): Promise<KhoTemplateData> {
    return this.put<KhoTemplateData>({ html }, { endpoint: `/${loai}` });
  }

  /** Xoá mẫu in (về mặc định). */
  async remove(loai: string): Promise<void> {
    await this.delete({ endpoint: `/${loai}` });
  }
}

export const khoTemplateService = new KhoTemplateService();
