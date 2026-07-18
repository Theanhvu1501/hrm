import { DoiTuong } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

type DoiTuongLoai = DoiTuong['loai'][number];

interface DoiTuongResponse extends Omit<DoiTuong, 'id'> {
  _id?: string;
  id?: string;
}

class DoiTuongService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/doi-tuong' });
  }

  private mapDoiTuong(item: DoiTuongResponse): DoiTuong {
    return {
      ...item,
      id: item._id || item.id || '',
    } as DoiTuong;
  }

  async getPaginated(params: PaginationParams & { loai?: DoiTuongLoai } = {}): Promise<PaginatedResponse<DoiTuong>> {
    const response = await this.get<{ data: DoiTuongResponse[]; meta: PaginatedResponse<DoiTuong>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search, loai: params.loai },
    });
    return {
      data: response.data.map((item) => this.mapDoiTuong(item)),
      meta: response.meta,
    };
  }

  /**
   * Get total count from separate API
   */
  async getTotal(params: { search?: string; loai?: DoiTuongLoai } = {}): Promise<number> {
    const result = await this.get<{ total: number }>({
      endpoint: '/total',
      params: { search: params.search, loai: params.loai },
    });
    return result.total;
  }

  /**
   * Get all items without pagination
   */
  async getAll(loai?: DoiTuongLoai): Promise<DoiTuong[]> {
    const params: Record<string, string> = {};
    if (loai) params.loai = loai;
    const data = await this.get<DoiTuongResponse[]>({ endpoint: '/all', params });
    return data.map((item) => this.mapDoiTuong(item));
  }

  async getById(id: string): Promise<DoiTuong> {
    const data = await this.get<DoiTuongResponse>({ endpoint: `/${id}` });
    return this.mapDoiTuong(data);
  }

  async getByLoai(loai: DoiTuongLoai): Promise<DoiTuong[]> {
    return this.getAll(loai);
  }

  async create(data: Omit<DoiTuong, 'id'>): Promise<DoiTuong> {
    const result = await this.post<DoiTuongResponse>(data);
    return this.mapDoiTuong(result);
  }

  async update(id: string, data: Partial<DoiTuong>): Promise<DoiTuong> {
    const result = await this.put<DoiTuongResponse>(data, { endpoint: `/${id}` });
    return this.mapDoiTuong(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async search(keyword: string, loai?: DoiTuongLoai): Promise<DoiTuong[]> {
    const data = await this.get<DoiTuongResponse[]>({
      endpoint: '/search',
      params: { keyword, ...(loai ? { loai } : {}) },
    });
    return data.map((item) => this.mapDoiTuong(item));
  }

  /**
   * Check if ma already exists
   */
  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: { ma, excludeId },
    });
    return result.exists;
  }

  /**
   * Get statistics from separate API
   */
  async getStats(): Promise<DoiTuongStats> {
    const result = await this.get<DoiTuongStats>({
      endpoint: '/stats',
    });
    return result;
  }
}

export interface DoiTuongStats {
  tongDoiTuong: number;
  khachHang: number;
  nhaCungCap: number;
  nhanVien: number;
  nhaThau: number;
}

export const doiTuongService = new DoiTuongService();
