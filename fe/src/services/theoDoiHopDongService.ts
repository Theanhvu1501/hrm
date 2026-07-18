import { TheoDoiHopDong, TheoDoiHopDongRow, BaoCaoHopDongRow } from '@/types';
import { ServiceBase } from './base/service-base';

export interface TheoDoiHopDongStats {
  tongGiaTri: number;
  tongDaThanhToan: number;
  tongConLai: number;
}

/** Theo dõi hợp đồng — /master-data/theo-doi-hop-dong (BE bọc { success, data }). */
class TheoDoiHopDongService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/theo-doi-hop-dong' });
  }

  /** Danh sách HĐ (join danh mục + tracking + tổng đã tính). */
  async getList(
    params: { nam?: number; search?: string } = {},
  ): Promise<TheoDoiHopDongRow[]> {
    return this.get<TheoDoiHopDongRow[]>({ params });
  }

  /** Bản tracking của 1 HĐ (null nếu chưa có). */
  async getByHopDongId(hopDongId: string): Promise<TheoDoiHopDong | null> {
    return this.get<TheoDoiHopDong | null>({ endpoint: `/${hopDongId}` });
  }

  /** Lưu (upsert) tracking cho 1 HĐ. */
  async upsert(
    hopDongId: string,
    data: Partial<TheoDoiHopDong>,
  ): Promise<TheoDoiHopDong> {
    return this.put<TheoDoiHopDong>(data, { endpoint: `/${hopDongId}` });
  }

  async getStats(): Promise<TheoDoiHopDongStats> {
    return this.get<TheoDoiHopDongStats>({ endpoint: '/stats' });
  }

  /** Báo cáo nhanh theo năm. */
  async getBaoCao(): Promise<{ rows: BaoCaoHopDongRow[]; tong: BaoCaoHopDongRow }> {
    return this.get<{ rows: BaoCaoHopDongRow[]; tong: BaoCaoHopDongRow }>({
      endpoint: '/bao-cao',
    });
  }
}

export const theoDoiHopDongService = new TheoDoiHopDongService();
