import { ServiceBase } from './base/service-base';

export interface SoDuDauKyItem {
  maTaiKhoan: string;
  duNo: number;
  duCo: number;
  chiTietType?: string;
  chiTietId?: string;
  chiTietMa?: string;
  chiTietTen?: string;
  nganHang?: string;
}

export interface SoDuDauKyData {
  ngayApDung: string | null;
  items: SoDuDauKyItem[];
  tongNo: number;
  tongCo: number;
  canDoi: boolean;
}

export interface SaveSoDuDauKyPayload {
  ngayApDung: string;
  items: SoDuDauKyItem[];
}

class SoDuDauKyService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/so-du-dau-ky' });
  }

  async getAll(): Promise<SoDuDauKyData> {
    return this.get<SoDuDauKyData>();
  }

  async saveBulk(payload: SaveSoDuDauKyPayload): Promise<SoDuDauKyData> {
    return this.put<SoDuDauKyData>(payload);
  }
}

export const soDuDauKyService = new SoDuDauKyService();
