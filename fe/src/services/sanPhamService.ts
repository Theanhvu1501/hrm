import { SanPham } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface SanPhamResponse extends Omit<SanPham, 'id'> {
  _id?: string;
  id?: string;
}

class SanPhamService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/san-pham' });
  }

  private mapSanPham(item: SanPhamResponse): SanPham {
    return {
      ...item,
      id: item._id || item.id || '',
    } as SanPham;
  }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<SanPham>> {
    const response = await this.get<{ data: SanPhamResponse[]; meta: PaginatedResponse<SanPham>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.mapSanPham(item)),
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
  async getAll(): Promise<SanPham[]> {
    const data = await this.get<SanPhamResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.mapSanPham(item));
  }

  async getById(id: string): Promise<SanPham> {
    const data = await this.get<SanPhamResponse>({ endpoint: `/${id}` });
    return this.mapSanPham(data);
  }

  async create(data: Omit<SanPham, 'id'>): Promise<SanPham> {
    const result = await this.post<SanPhamResponse>(data);
    return this.mapSanPham(result);
  }

  async update(id: string, data: Partial<SanPham>): Promise<SanPham> {
    const result = await this.put<SanPhamResponse>(data, { endpoint: `/${id}` });
    return this.mapSanPham(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async search(keyword: string): Promise<SanPham[]> {
    const data = await this.get<SanPhamResponse[]>({ endpoint: '/search', params: { keyword } });
    return data.map((item) => this.mapSanPham(item));
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
  async getStats(): Promise<SanPhamStats> {
    return this.get<SanPhamStats>({ endpoint: '/stats' });
  }
}

export interface SanPhamStats {
  tongSanPham: number;
  coGiaBan: number;
  chuaCoGia: number;
}

export const sanPhamService = new SanPhamService();
