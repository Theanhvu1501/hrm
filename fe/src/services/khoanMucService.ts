import { KhoanMuc } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface KhoanMucResponse extends Omit<KhoanMuc, 'id'> {
  _id?: string;
  id?: string;
}

interface KhoanMucPaginationParams extends PaginationParams {
  loai?: KhoanMuc['loai'];
}

export interface KhoanMucStats {
  tongKhoanMuc: number;
  chiPhi: number;
  doanhThu: number;
}

class KhoanMucService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/khoan-muc' });
  }

  private mapKhoanMuc(item: KhoanMucResponse): KhoanMuc {
    return {
      ...item,
      id: item._id || item.id || '',
    } as KhoanMuc;
  }

  async getPaginated(params: KhoanMucPaginationParams = {}): Promise<PaginatedResponse<KhoanMuc>> {
    const response = await this.get<{ data: KhoanMucResponse[]; meta: PaginatedResponse<KhoanMuc>['meta'] }>({
      params: {
        page: params.page || 1,
        limit: params.limit || 10,
        search: params.search,
        loai: params.loai,
      },
    });
    return {
      data: response.data.map((item) => this.mapKhoanMuc(item)),
      meta: response.meta,
    };
  }

  /**
   * Get total count from separate API
   */
  async getTotal(search?: string): Promise<number> {
    const result = await this.get<{ total: number }>({
      endpoint: '/total',
      params: { search },
    });
    return result.total;
  }

  /**
   * @deprecated Use getPaginated instead for better performance
   */
  async getAll(): Promise<KhoanMuc[]> {
    const response = await this.getPaginated({ limit: 100 });
    return response.data;
  }

  async getById(id: string): Promise<KhoanMuc> {
    const data = await this.get<KhoanMucResponse>({ endpoint: `/${id}` });
    return this.mapKhoanMuc(data);
  }

  async create(data: Omit<KhoanMuc, 'id'>): Promise<KhoanMuc> {
    const result = await this.post<KhoanMucResponse>(data);
    return this.mapKhoanMuc(result);
  }

  async update(id: string, data: Partial<KhoanMuc>): Promise<KhoanMuc> {
    const result = await this.put<KhoanMucResponse>(data, { endpoint: `/${id}` });
    return this.mapKhoanMuc(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  /**
   * Get by loai using dedicated API endpoint
   */
  async getByLoai(loai: KhoanMuc['loai'], limit = 100): Promise<KhoanMuc[]> {
    const data = await this.get<KhoanMucResponse[]>({
      endpoint: `/loai/${loai}`,
      params: { limit },
    });
    return data.map((item) => this.mapKhoanMuc(item));
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<KhoanMucStats> {
    try {
      const result = await this.get<KhoanMucStats>({ endpoint: '/stats' });
      return result;
    } catch {
      // Fallback: calculate from paginated data if stats endpoint not available
      const allData = await this.getPaginated({ limit: 1000 });
      const items = allData.data;
      return {
        tongKhoanMuc: items.length,
        chiPhi: items.filter((item) => item.loai === 'CHI_PHI').length,
        doanhThu: items.filter((item) => item.loai === 'DOANH_THU').length,
      };
    }
  }

  /**
   * Check if ma already exists
   */
  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    try {
      const result = await this.get<{ exists: boolean }>({
        endpoint: '/check-ma',
        params: { ma, excludeId },
      });
      return result.exists;
    } catch {
      return false;
    }
  }
}

export const khoanMucService = new KhoanMucService();
