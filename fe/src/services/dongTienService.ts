import { DongTien } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface DongTienResponse extends Omit<DongTien, 'id'> {
  _id?: string;
  id?: string;
}

class DongTienService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/dong-tien' });
  }

  private mapDongTien(item: DongTienResponse): DongTien {
    return {
      ...item,
      id: item._id || item.id || '',
    } as DongTien;
  }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<DongTien>> {
    const response = await this.get<{ data: DongTienResponse[]; meta: PaginatedResponse<DongTien>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.mapDongTien(item)),
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
   * Get all items without pagination
   */
  async getAll(): Promise<DongTien[]> {
    const data = await this.get<DongTienResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.mapDongTien(item));
  }

  async getById(id: string): Promise<DongTien> {
    const data = await this.get<DongTienResponse>({ endpoint: `/${id}` });
    return this.mapDongTien(data);
  }

  async create(data: Omit<DongTien, 'id'>): Promise<DongTien> {
    const result = await this.post<DongTienResponse>(data);
    return this.mapDongTien(result);
  }

  async update(id: string, data: Partial<DongTien>): Promise<DongTien> {
    const result = await this.put<DongTienResponse>(data, { endpoint: `/${id}` });
    return this.mapDongTien(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  /**
   * Get by loai using dedicated API endpoint
   */
  async getByLoai(loai: DongTien['loai'], limit = 100): Promise<DongTien[]> {
    const data = await this.get<DongTienResponse[]>({
      endpoint: `/loai/${loai}`,
      params: { limit },
    });
    return data.map((item) => this.mapDongTien(item));
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: { ma, excludeId },
    });
    return result.exists;
  }

  /**
   * Get statistics from dedicated API endpoint
   */
  async getStats(): Promise<DongTienStats> {
    return this.get<DongTienStats>({ endpoint: '/stats' });
  }
}

export interface DongTienStats {
  tongSo: number;
  kinhDoanh: number;
  dauTu: number;
  taiChinh: number;
}

export const dongTienService = new DongTienService();
