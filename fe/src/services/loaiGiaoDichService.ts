import { LoaiGiaoDich } from '@/types';
import { ServiceBase, PaginatedResponse, PaginationParams } from './base/service-base';

interface LoaiGiaoDichResponse extends Omit<LoaiGiaoDich, 'id'> {
  _id?: string;
  id?: string;
}

export interface LoaiGiaoDichStats {
  tongLoaiGiaoDich: number;
}

class LoaiGiaoDichService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/loai-giao-dich' });
  }

  private mapLoaiGiaoDich(item: LoaiGiaoDichResponse): LoaiGiaoDich {
    return {
      ...item,
      id: item._id || item.id || '',
    } as LoaiGiaoDich;
  }

  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<LoaiGiaoDich>> {
    const response = await this.get<{ data: LoaiGiaoDichResponse[]; meta: PaginatedResponse<LoaiGiaoDich>['meta'] }>({
      params: { page: params.page || 1, limit: params.limit || 10, search: params.search },
    });
    return {
      data: response.data.map((item) => this.mapLoaiGiaoDich(item)),
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
  async getAll(): Promise<LoaiGiaoDich[]> {
    const data = await this.get<LoaiGiaoDichResponse[]>({ endpoint: '/all' });
    return data.map((item) => this.mapLoaiGiaoDich(item));
  }

  async getById(id: string): Promise<LoaiGiaoDich> {
    const data = await this.get<LoaiGiaoDichResponse>({ endpoint: `/${id}` });
    return this.mapLoaiGiaoDich(data);
  }

  async create(data: Omit<LoaiGiaoDich, 'id'>): Promise<LoaiGiaoDich> {
    const result = await this.post<LoaiGiaoDichResponse>(data);
    return this.mapLoaiGiaoDich(result);
  }

  async update(id: string, data: Partial<LoaiGiaoDich>): Promise<LoaiGiaoDich> {
    const result = await this.put<LoaiGiaoDichResponse>(data, { endpoint: `/${id}` });
    return this.mapLoaiGiaoDich(result);
  }

  async remove(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  async search(keyword: string): Promise<LoaiGiaoDich[]> {
    return this.get<LoaiGiaoDich[]>({ endpoint: '/search', params: { keyword } });
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const result = await this.get<{ exists: boolean }>({
      endpoint: '/check-ma',
      params: { ma, excludeId },
    });
    return result.exists;
  }

  async getStats(): Promise<LoaiGiaoDichStats> {
    const result = await this.get<LoaiGiaoDichStats>({
      endpoint: '/stats',
    });
    return result;
  }
}

export const loaiGiaoDichService = new LoaiGiaoDichService();
